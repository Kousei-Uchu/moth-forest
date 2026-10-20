#!/usr/bin/env python3
"""Gather a large, filtered set of reference photos for the moth presets.

Run it on your own machine (it needs open internet access and a one-off ~600 MB CLIP download):

    pip3 install -r tools/requirements.txt
    python3 tools/gather_refs.py                     # all 15 species, 25 photos per view
    python3 tools/gather_refs.py --species "Luna moth,Atlas moth" --per-bucket 40

How it works (per species):
  1. Candidate photos stream in from several sources:
       commons    Wikimedia Commons category tree for the species (huge, specimen photos)
       inat       iNaturalist adult research-grade observations, all open-licensed photos
       gbif       GBIF occurrence media (museums + observation networks), open-licensed only
       openverse  Openverse CC image search
       web        general web image search (DuckDuckGo). Licence unknown, so these go to restricted/.
  2. Each photo is downloaded, size-checked, near-duplicate-checked (perceptual hash), then a local
     CLIP model sorts it into a view bucket or rejects it:
       dorsal / ventral / lateral / live (natural pose) / head (close-up of head and antennae)
       rejects: caterpillar, pupa, drawing, map, specimen plate/collage, person, butterfly, wrong species...
  3. The loop is adaptive: structured sources run first; any bucket still short then gets bucket-specific
     web queries (several phrasings each) until it is full or the queries run out.
  4. Accepted photos are re-encoded as JPEG and written to per-species zips.

Output (default folder reference_images/):
    open/<species>.zip         CC0 / public domain / CC-BY / CC-BY-SA only, safe to commit
    open/manifest_open.csv     source, licence, author, page URL, CLIP scores for every photo
    restricted/...             non-commercial or unknown-licence photos. For private reference only: git-ignored
    _work/                     images and caches (git-ignored); re-running resumes from here
"""
import argparse, csv, hashlib, io, json, os, re, shutil, sys, time, zipfile
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

import requests
from PIL import Image

UA = "moth-forest-reference-gatherer/2.0 (personal reference collection; contact via GitHub Kousei-Uchu/moth-forest)"
CLIP_ID = "openai/clip-vit-base-patch32"

SPECIES = {
    "Rosy maple moth": "Dryocampa rubicunda",
    "Luna moth": "Actias luna",
    "Atlas moth": "Attacus atlas",
    "Polyphemus moth": "Antheraea polyphemus",
    "Io moth": "Automeris io",
    "Cinnabar moth": "Tyria jacobaeae",
    "Sunset moth": "Chrysiridia rhipheus",
    "Giant leopard moth": "Hypercompe scribonia",
    "Peppered moth": "Biston betularia",
    "Death's-head hawkmoth": "Acherontia atropos",
    "Elephant hawkmoth": "Deilephila elpenor",
    "Garden tiger moth": "Arctia caja",
    "Imperial moth": "Eacles imperialis",
    "Cecropia moth": "Hyalophora cecropia",
    "Buff-tip moth": "Phalera bucephala",
}
# extra names used only for web queries (other languages / older names)
ALIASES = {
    "Luna moth": ["American moon moth", "Mondspinner"],
    "Atlas moth": ["Attacus atlas atlas moth", "Atlasspinner"],
    "Death's-head hawkmoth": ["death head hawk moth", "Totenkopfschwärmer"],
    "Elephant hawkmoth": ["large elephant hawk-moth", "Mittlerer Weinschwärmer"],
    "Garden tiger moth": ["great tiger moth", "Brauner Bär"],
    "Cinnabar moth": ["cinnabar", "Blutbär"],
    "Sunset moth": ["Madagascan sunset moth", "Urania ripheus"],
    "Rosy maple moth": ["rosy maple", "Dryocampa"],
    "Buff-tip moth": ["buff tip", "Mondvogel"],
    "Peppered moth": ["peppered moth Biston", "Birkenspanner"],
}

VIEWS = ["dorsal", "ventral", "lateral", "live", "head"]
VIEW_PROMPTS = {
    "dorsal": "a top-down photo of a {n} moth with its wings spread flat, seen from above",
    "ventral": "a photo of the underside of a {n} moth with its wings spread, seen from below",
    "lateral": "a side-view photo of a {n} moth with its wings folded, seen in profile",
    "live": "a natural photo of a {n} moth resting on a surface",
    "head": "a close-up macro photo of the head, eyes and antennae of a {n} moth",
}
REJECT_PROMPTS = {
    "larva": "a photo of a caterpillar",
    "pupa": "a photo of a pupa or cocoon",
    "egg": "a photo of insect eggs",
    "drawing": "a drawing, painting or illustration of a moth",
    "map": "a map, chart or diagram",
    "plate": "a specimen plate or collage showing many different moths with labels",
    "person": "a photo of a person's face",
    "butterfly": "a photo of a butterfly",
    "other": "a photo of a plant, landscape or building with no moth",
    "text": "a logo or a page of text",
}
QUERIES = {
    "dorsal": ["{sci} dorsal view wings spread", "{c} specimen dorsal", "{c} top view wings open", "{sci} pinned museum specimen", "{c} wings spread flat"],
    "ventral": ["{sci} ventral view underside", "{c} underside wings", "{sci} specimen ventral"],
    "lateral": ["{c} side view", "{sci} lateral view resting", "{c} profile resting wings folded"],
    "live": ["{c} resting", "{sci} adult photo", "{c} on bark", "{c} on leaf", "{c} in the wild"],
    "head": ["{c} head close up", "{sci} face macro eyes antennae", "{c} antennae macro"],
}
OPEN_LICENSES = {"cc0", "pd", "cc-by", "cc-by-sa"}


# ---------------------------------------------------------------- http
_last = {}
def http_get(url, params=None, stream=False, tries=4, delay=0.6, timeout=40):
    host = urllib.parse.urlparse(url).netloc
    for i in range(tries):
        wait = _last.get(host, 0) + delay - time.time()
        if wait > 0:
            time.sleep(wait)
        _last[host] = time.time()
        try:
            r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=timeout, stream=stream)
            if r.status_code == 429 or r.status_code >= 500:
                time.sleep(float(r.headers.get("Retry-After", 5 * (i + 1))))
                continue
            r.raise_for_status()
            return r
        except Exception as e:
            if i == tries - 1:
                print(f"    gave up on {url[:90]} ({e})", file=sys.stderr)
            time.sleep(2 * (i + 1))
    return None


def get_json(url, params=None):
    r = http_get(url, params)
    try:
        return r.json() if r else None
    except Exception:
        return None


def fetch_image(url, max_bytes=15_000_000):
    r = http_get(url, stream=True, delay=0.25, tries=2)
    if not r or "image" not in r.headers.get("Content-Type", "image"):
        return None
    data = r.raw.read(max_bytes + 1, decode_content=True)
    if len(data) > max_bytes:
        return None
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
        return im
    except Exception:
        return None


# ---------------------------------------------------------------- licences
def lic_code(s):
    s = (s or "").lower().replace("_", "-").replace(" ", "-")
    if "publicdomain/zero" in s or s.startswith("cc0") or s in ("cc-zero", "zero"):
        return "cc0"
    if "public-domain" in s or s in ("pd", "pdm", "pdm-1.0") or "publicdomain/mark" in s:
        return "pd"
    m = re.search(r"(?:cc-)?by((?:-nc)?(?:-sa|-nd)?)", s)
    if m:
        return "cc-by" + m.group(1)
    m = re.search(r"licenses/by((?:-nc)?(?:-sa|-nd)?)/", s)
    return ("cc-by" + m.group(1)) if m else "other"


def lic_class(code):
    return "open" if code in OPEN_LICENSES else "restricted"


# ---------------------------------------------------------------- sources
def commons_files(sci, limit):
    """Files in Category:<sci>, plus subcategories two levels deep."""
    seen_cat, files, todo = set(), [], [(f"Category:{sci}", 0)]
    while todo and len(files) < limit * 3:
        cat, depth = todo.pop(0)
        if cat in seen_cat:
            continue
        seen_cat.add(cat)
        for kind in ("file", "subcat"):
            cont = {}
            while True:
                j = get_json("https://commons.wikimedia.org/w/api.php", {
                    "action": "query", "format": "json", "list": "categorymembers", "cmtitle": cat,
                    "cmtype": kind, "cmlimit": 500, **cont})
                if not j:
                    break
                for m in j["query"]["categorymembers"]:
                    if kind == "file":
                        files.append(m["title"])
                    elif depth < 2 and not re.search(r"larva|pupa|egg|cocoon|caterpillar|genital|chromos|dna|map", m["title"], re.I):
                        todo.append((m["title"], depth + 1))
                if "continue" not in j or len(files) >= limit * 3:
                    break
                cont = {"cmcontinue": j["continue"]["cmcontinue"]}
    return files


def src_commons(common, sci, args):
    titles = [t for t in commons_files(sci, args.per_bucket * len(VIEWS))
              if re.search(r"\.jpe?g$", t, re.I) and not re.search(r"larva|pupa|egg|cocoon|caterpillar|map|distribution|logo|stamp", t, re.I)]
    for i in range(0, len(titles), 40):
        j = get_json("https://commons.wikimedia.org/w/api.php", {
            "action": "query", "format": "json", "titles": "|".join(titles[i:i + 40]), "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata", "iiurlwidth": 1100})
        for p in ((j or {}).get("query") or {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            if ii.get("mime") != "image/jpeg" or min(ii.get("width", 0), ii.get("height", 0)) < args.min_side:
                continue
            md = ii.get("extmetadata") or {}
            yield {"url": ii.get("thumburl") or ii["url"], "page": ii.get("descriptionurl", ""), "trusted": True,
                   "author": re.sub(r"<[^>]+>", "", (md.get("Artist") or {}).get("value", "")).strip(),
                   "lic": lic_code((md.get("LicenseShortName") or {}).get("value", ""))}


def src_inat(common, sci, args):
    j = get_json("https://api.inaturalist.org/v1/taxa", {"q": sci, "rank": "species", "per_page": 1})
    if not j or not j["results"]:
        return
    tid = j["results"][0]["id"]
    for page in range(1, args.inat_pages + 1):
        j = get_json("https://api.inaturalist.org/v1/observations", {
            "taxon_id": tid, "term_id": 1, "term_value_id": 2, "quality_grade": "research", "photos": "true",
            "per_page": 100, "page": page, "order_by": "votes"})
        if not j or not j["results"]:
            return
        for ob in j["results"]:
            for ph in (ob.get("photos") or [])[:3]:
                if ph.get("url") and ph.get("license_code"):
                    yield {"url": ph["url"].replace("square", "large"), "trusted": True,
                           "page": f"https://www.inaturalist.org/observations/{ob['id']}",
                           "author": ph.get("attribution", ""), "lic": lic_code(ph["license_code"])}


def src_gbif(common, sci, args):
    for off in range(0, args.gbif_pages * 300, 300):
        j = get_json("https://api.gbif.org/v1/occurrence/search", {
            "scientificName": sci, "mediaType": "StillImage", "limit": 300, "offset": off})
        if not j or not j.get("results"):
            return
        for oc in j["results"]:
            if str(oc.get("lifeStage", "")).lower() in ("larva", "pupa", "egg", "caterpillar"):
                continue
            for md in oc.get("media", [])[:2]:
                if md.get("identifier") and md.get("license"):
                    yield {"url": md["identifier"], "trusted": True, "page": md.get("references") or oc.get("references", ""),
                           "author": md.get("creator", ""), "lic": lic_code(md["license"])}
        if j.get("endOfRecords"):
            return


def src_openverse(common, sci, args):
    for page in range(1, args.openverse_pages + 1):
        j = get_json("https://api.openverse.org/v1/images/", {"q": f"{sci} moth", "page_size": 20, "page": page, "license_type": "all-cc"})
        if not j or not j.get("results"):
            return
        for it in j["results"]:
            yield {"url": it["url"], "trusted": False, "page": it.get("foreign_landing_url", ""),
                   "author": it.get("creator") or "", "lic": lic_code(it.get("license", ""))}


def ddgs_images(query, n):
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS
        return list(DDGS().images(query, max_results=n))
    except Exception as e:
        print(f"    web search failed for '{query}': {e}", file=sys.stderr)
        return []


def src_web(common, sci, bucket, args):
    names = [common] + ALIASES.get(common, [])
    for tmpl in QUERIES[bucket]:
        for nm in names[:2]:
            q = tmpl.format(c=nm if "moth" in nm.lower() else nm + " moth", sci=sci)
            for it in ddgs_images(q, args.web_results):
                if it.get("image"):
                    yield {"url": it["image"], "trusted": False, "page": it.get("url", ""), "author": it.get("source", ""), "lic": "other"}


STRUCTURED = {"commons": src_commons, "inat": src_inat, "gbif": src_gbif, "openverse": src_openverse}


# ---------------------------------------------------------------- classifier
class Clip:
    def __init__(self, device="auto"):
        import torch
        from transformers import CLIPModel, CLIPProcessor
        self.torch = torch
        self.dev = device if device != "auto" else ("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
        print(f"Loading CLIP ({CLIP_ID}) on {self.dev} ...")
        self.model = CLIPModel.from_pretrained(CLIP_ID).to(self.dev).eval()
        self.proc = CLIPProcessor.from_pretrained(CLIP_ID)
        self._t = {}

    def _emb(self, x):
        # transformers 4.x returns a tensor; 5.x returns an output object whose pooler_output holds the projected embeddings
        return x if self.torch.is_tensor(x) else x.pooler_output

    def _text(self, texts):
        k = tuple(texts)
        if k not in self._t:
            with self.torch.no_grad():
                f = self._emb(self.model.get_text_features(**self.proc(text=list(texts), return_tensors="pt", padding=True).to(self.dev)))
            self._t[k] = f / f.norm(dim=-1, keepdim=True)
        return self._t[k]

    def classify(self, images, common, sci):
        n = f"{common} ({sci})"
        labels = VIEWS + list(REJECT_PROMPTS)
        vp = [VIEW_PROMPTS[v].format(n=n) for v in VIEWS] + list(REJECT_PROMPTS.values())
        others = [c for c in SPECIES if c != common]
        sp_names = [common] + others + ["butterfly", "moth", "not an insect"]
        sp = [f"a photo of a {common} ({sci})"] + [f"a photo of a {c} ({SPECIES[c]})" for c in others] + [
            "a photo of a butterfly", "a photo of a moth", "a photo of something that is not an insect"]
        with self.torch.no_grad():
            f = self._emb(self.model.get_image_features(**self.proc(images=images, return_tensors="pt").to(self.dev)))
            f = f / f.norm(dim=-1, keepdim=True)
            pv = (100 * f @ self._text(vp).T).softmax(-1).cpu()
            ps = (100 * f @ self._text(sp).T).softmax(-1).cpu()
        out = []
        for i in range(len(images)):
            k, j = int(pv[i].argmax()), int(ps[i].argmax())
            out.append({"label": labels[k], "p": float(pv[i][k]), "sp_top": sp_names[j], "sp_p": float(ps[i][j]),
                        "wrong_species": sp_names[j] not in (common, "moth") and float(ps[i][j]) >= 0.5})
        return out


class FakeClip:
    """Stand-in for tests: cycles through the view buckets."""
    def __init__(self):
        self.i = 0
    def classify(self, images, common, sci):
        out = []
        for _ in images:
            out.append({"label": VIEWS[self.i % len(VIEWS)], "p": 0.9, "sp_top": common, "sp_p": 0.9, "wrong_species": False})
            self.i += 1
        return out


# ---------------------------------------------------------------- state / output
def dhash(im, size=8):
    g = im.convert("L").resize((size + 1, size), Image.LANCZOS)
    px = list(g.get_flattened_data() if hasattr(g, "get_flattened_data") else g.getdata())
    bits = 0
    for r in range(size):
        for c in range(size):
            bits = (bits << 1) | (px[r * (size + 1) + c] > px[r * (size + 1) + c + 1])
    return bits


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


COLS = ["species", "bucket", "file", "source", "licence", "author", "page_url", "image_url", "clip_label", "clip_p", "clip_species_top", "clip_species_p"]


class State:
    def __init__(self, out):
        self.out, self.work = out, os.path.join(out, "_work")
        os.makedirs(self.work, exist_ok=True)
        self.rows, self.seen_urls, self.hashes = [], set(), {}
        self.path = os.path.join(self.work, "manifest_all.csv")
        if os.path.exists(self.path):
            with open(self.path, newline="", encoding="utf-8") as f:
                self.rows = list(csv.DictReader(f))
        for r in self.rows:
            self.seen_urls.add(r["image_url"])
        for r in self.rows:  # rebuild hashes for resume
            p = os.path.join(self.work, slug(r["species"]), r["bucket"], r["file"])
            if os.path.exists(p):
                try:
                    self.hashes.setdefault(r["species"], []).append(dhash(Image.open(p)))
                except Exception:
                    pass
        with open(os.path.join(out, ".gitignore"), "w") as f:
            f.write("_work/\nrestricted/\n")

    def count(self, sp, bucket):
        return sum(1 for r in self.rows if r["species"] == sp and r["bucket"] == bucket)

    def add(self, row):
        self.rows.append(row)
        self.seen_urls.add(row["image_url"])
        with open(self.path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, COLS)
            w.writeheader()
            w.writerows(self.rows)

    def write_zips(self):
        for cls in ("open", "restricted"):
            d = os.path.join(self.out, cls)
            os.makedirs(d, exist_ok=True)
            rows = [r for r in self.rows if lic_class(r["licence"]) == cls]
            with open(os.path.join(d, f"manifest_{cls}.csv"), "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, COLS)
                w.writeheader()
                w.writerows(rows)
            for sp in sorted({r["species"] for r in rows}):
                with zipfile.ZipFile(os.path.join(d, slug(sp) + ".zip"), "w", zipfile.ZIP_STORED) as z:
                    for r in rows:
                        if r["species"] == sp:
                            z.write(os.path.join(self.work, slug(sp), r["bucket"], r["file"]), f"{slug(sp)}/{r['bucket']}/{r['file']}")
        total = {c: sum(os.path.getsize(os.path.join(self.out, c, f)) for f in os.listdir(os.path.join(self.out, c)) if f.endswith(".zip")) / 1048576
                 for c in ("open", "restricted")}
        print(f"Zips written: open {total['open']:.1f} MB, restricted {total['restricted']:.1f} MB")


def process(cands, common, sci, args, clip, st, needed):
    """Download, dedupe, classify and save one batch. needed = set of buckets still open."""
    def dl(c):
        return c, fetch_image(c["url"])
    with ThreadPoolExecutor(args.threads) as ex:
        got = list(ex.map(dl, cands))
    keep = []
    for c, im in got:
        if im is None or min(im.size) < args.min_side:
            continue
        h = dhash(im)
        if any(bin(h ^ o).count("1") <= 4 for o in st.hashes.get(common, [])):
            continue
        keep.append((c, im.convert("RGB"), h))
    if not keep:
        return 0
    res = clip.classify([k[1] for k in keep], common, sci)
    saved = 0
    for (c, im, h), r in zip(keep, res):
        b = r["label"]
        if b not in needed or r["p"] < args.view_thr or st.count(common, b) >= args.per_bucket:
            continue
        if (not c["trusted"] or args.strict_species) and r["wrong_species"]:
            continue
        im.thumbnail((args.max_side, args.max_side), Image.LANCZOS)
        name = f"{b}_{hashlib.sha1(c['url'].encode()).hexdigest()[:10]}.jpg"
        d = os.path.join(st.work, slug(common), b)
        os.makedirs(d, exist_ok=True)
        im.save(os.path.join(d, name), "JPEG", quality=args.quality, optimize=True)
        st.hashes.setdefault(common, []).append(h)
        st.add({"species": common, "bucket": b, "file": name, "source": c["src"], "licence": c["lic"], "author": c["author"],
                "page_url": c["page"], "image_url": c["url"], "clip_label": b, "clip_p": f"{r['p']:.2f}",
                "clip_species_top": r["sp_top"], "clip_species_p": f"{r['sp_p']:.2f}"})
        saved += 1
    return saved


def run_species(common, sci, args, clip, st):
    def short():
        return {b for b in VIEWS if st.count(common, b) < args.per_bucket}
    print(f"\n== {common} ({sci}) ==  have: " + ", ".join(f"{b} {st.count(common, b)}" for b in VIEWS))

    def feed(stream, src):
        batch = []
        for c in stream:
            if c["url"] in st.seen_urls:
                continue
            st.seen_urls.add(c["url"])
            c["src"] = src
            batch.append(c)
            if len(batch) >= args.batch:
                n = process(batch, common, sci, args, clip, st, short())
                batch = []
                print(f"    [{src}] +{n}  " + " ".join(f"{b}:{st.count(common, b)}" for b in VIEWS), flush=True)
                if not short():
                    return True
        if batch:
            process(batch, common, sci, args, clip, st, short())
        return not short()

    for src in args.sources:
        if src in STRUCTURED and short():
            print(f"  source: {src}")
            if feed(STRUCTURED[src](common, sci, args), src):
                return
    if "web" in args.sources:
        for b in VIEWS:  # adaptive: only bucket-specific web queries for buckets that are still short
            if b in short():
                print(f"  web search for '{b}' ({st.count(common, b)}/{args.per_bucket})")
                feed(src_web(common, sci, b, args), "web")
    print("  final: " + ", ".join(f"{b} {st.count(common, b)}" for b in VIEWS))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--species", help="comma-separated common names (default: all)")
    ap.add_argument("--per-bucket", type=int, default=25, help="photos to keep per view bucket per species")
    ap.add_argument("--sources", default="commons,inat,gbif,openverse,web", type=lambda s: s.split(","))
    ap.add_argument("--out", default="reference_images")
    ap.add_argument("--min-side", type=int, default=500)
    ap.add_argument("--max-side", type=int, default=900)
    ap.add_argument("--quality", type=int, default=80)
    ap.add_argument("--view-thr", type=float, default=0.30, help="min CLIP probability for the chosen view label")
    ap.add_argument("--strict-species", action="store_true", help="also run the wrong-species check on trusted sources")
    ap.add_argument("--inat-pages", type=int, default=5)
    ap.add_argument("--gbif-pages", type=int, default=4)
    ap.add_argument("--openverse-pages", type=int, default=5)
    ap.add_argument("--web-results", type=int, default=60)
    ap.add_argument("--batch", type=int, default=24)
    ap.add_argument("--threads", type=int, default=8)
    ap.add_argument("--device", default="auto")
    ap.add_argument("--fake-clip", action="store_true", help="testing only: skip the model")
    args = ap.parse_args()

    names = [s.strip() for s in args.species.split(",")] if args.species else list(SPECIES)
    for n in names:
        if n not in SPECIES:
            sys.exit(f"Unknown species '{n}'. Choose from: {', '.join(SPECIES)}")
    clip = FakeClip() if args.fake_clip else Clip(args.device)
    st = State(args.out)
    try:
        for n in names:
            run_species(n, SPECIES[n], args, clip, st)
            st.write_zips()  # after every species, so an interrupted run still leaves usable zips
    except KeyboardInterrupt:
        print("\nInterrupted: writing zips for what was collected so far.")
        st.write_zips()
    print("\nDone. Commit reference_images/open/ (safe licences). restricted/ and _work/ are git-ignored.")


if __name__ == "__main__":
    main()
