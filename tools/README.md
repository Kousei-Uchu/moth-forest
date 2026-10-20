# tools/gather_refs.py

Collects a large, CLIP-filtered set of moth reference photos (dorsal / ventral / lateral / live / head close-ups) for the 15 presets.

```bash
pip3 install -r tools/requirements.txt
python3 tools/gather_refs.py                      # everything, 25 photos per view per species
python3 tools/gather_refs.py --species "Luna moth" --per-bucket 40
python3 tools/gather_refs.py --sources commons,inat,gbif    # licensed sources only, no web search
```

Output goes to `reference_images/`:

- `open/<species>.zip` + `open/manifest_open.csv`: CC0 / public domain / CC-BY / CC-BY-SA. Fine to commit.
- `restricted/`: non-commercial or unknown-licence photos (web search results land here). Git-ignored on purpose;
  keep them out of a public repo.
- `_work/`: images and caches (git-ignored). Re-running resumes from here and only fetches what is still missing.

Each source is abandoned for a species once it stops adding anything to a view that is still short (`--stall`, default 3 empty batches in a row; `--source-cap`, default 400 candidates), so rare views like `head` and `ventral` no longer make it grind through every iNaturalist, GBIF and Openverse photo before moving on to the next species. Every downloaded-and-not-kept URL is remembered in `_work/dead_urls.txt`; delete that file if you raise `--per-bucket` and want those photos reconsidered.

Press Ctrl-C at any time; zips are rewritten for what has been collected so far.
Tune the filter with `--view-thr` (default 0.30) and `--strict-species`.
