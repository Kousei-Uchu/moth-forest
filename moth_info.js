/* moth_info.js
   Content for the builder's Info tab: a short summary and expandable sections explaining how the app works.
   Written for a general reader first (no jargon without a plain explanation), with enough specifics that a
   technical reader is not talked down to.

   Browser:  MothInfo.html() -> HTML string (a summary followed by <details> sections)
   Only touches window.MothInfo and never the DOM. */
(function (root) {
  'use strict';

  /* Each section: a title and a block of HTML. Keep paragraphs short and concrete. */
  const SECTIONS = [
    {
      title: 'Start here: making your first moth',
      body: `
        <p>There are three ways in, and you can mix them freely.</p>
        <ul>
          <li><b>Pick a species.</b> On the Species tab, the preset list holds real moths such as the Luna, Atlas and cinnabar moths, already set up.</li>
          <li><b>Roll a seed.</b> Press the dice button for a random moth, or type any word or number and press Enter.</li>
          <li><b>Take the quiz.</b> Answer a few questions about yourself and the app designs a moth to match.</li>
        </ul>
        <p>Whichever you choose, everything is a starting point. Open any other tab and change whatever you like; the picture updates as you drag.</p>`
    },
    {
      title: 'Seeds and styles: why you get the same moth every time',
      body: `
        <p>A seed is just a code. The app turns the code into a moth using a fixed recipe, so the same seed always gives the same moth, on any device. Typing "Grandma" gives one moth, and it will be that moth every time.</p>
        <p>The style menu steers the recipe. <b>Cute</b> leans soft and fuzzy, <b>Cryptic</b> leans bark-coloured, <b>Showy</b> leans bright, <b>Spooky</b> leans dark, and so on. <b>Any</b> mixes them all and sometimes hands you a named species, either as it is in nature or recoloured as a cousin.</p>
        <p>With around four billion seeds per style, you will not run out.</p>`
    },
    {
      title: 'The shape tabs: wings, body and antennae',
      body: `
        <p><b>Forewing</b> is the front pair, the ones you see when a moth is sitting with its wings closed. <b>Hindwing</b> is the back pair, which often hides a surprise colour.</p>
        <p><b>Body</b> covers the chest, belly, head, eyes and how fuzzy the moth is. <b>Antennae</b> sets the type (thread, saw-edged, feathered or club-tipped) and length.</p>
        <p>The sliders look after each other. If you make the wings very wide, the hooked-tip slider shrinks its own range, because a moth built that way could not exist. This keeps even wild experiments looking like a plausible insect.</p>`
    },
    {
      title: 'Patterns, colours and views',
      body: `
        <p>The pattern tabs add <b>bands</b> (stripes), <b>spots</b>, <b>eyespots</b> (the staring circles some moths use to startle birds), plus edge borders, veins, speckles and fringes. Each marking has its own position, size and colour, and you can add as many as you want.</p>
        <p><b>Palette</b> holds the main colours. <b>Style</b> switches between top, underside and side views, adds a little hand-drawn wobble to the outlines ("organic irregularity"), and sets how faded the underside looks.</p>`
    },
    {
      title: 'Wingspan: giving the moth a real size',
      body: `
        <p>The drawing is always the same size on screen, so by itself it cannot tell a pinhead-sized moth from a dinner-plate-sized one. The <b>wingspan</b> setting on the Species tab fixes that. It is the distance from one wingtip to the other, in centimetres or inches. The app picks the unit from your device language, and the unit buttons let you switch.</p>
        <p>Named species come with a typical real wingspan. Seeded and random moths start on <b>Auto</b>. The Ecology tab then guesses a size from clues that go with size in real moths: a heavy body, long tails, big eyespots, feathered antennae, a hawkmoth or silk-moth build. Expect it to land within about a third of the true size for typical moths, and it says when it is guessing. The screensaver uses the same guess. Type a number to replace it.</p>
        <p>Size matters more than it looks: it changes how a moth warms up, how far it travels and how big a caterpillar it must have been. See the next section.</p>`
    },
    {
      title: 'The Ecology tab: how the app "knows" where a moth lives',
      body: `
        <p>It can't know, and it admits that. It reasons like a naturalist looking at an unlabelled specimen.</p>
        <p>It measures the moth: colours, wing length against width, how heavy the body is for its wings, the coat of fuzz, the antennae, the markings and the wingspan. Then it weighs those clues against well-established patterns in real moths. For example:</p>
        <ul>
          <li>Pale, sleek moths tend to live in hot, dry, bright places, where dark colour would overheat them.</li>
          <li>Woolly moths tend to fly in the cold, because the fuzz holds in heat.</li>
          <li>Loud red or orange on black is usually a warning that the moth tastes bad.</li>
          <li>Feathered antennae are for catching scent, so they point to a male searching for a mate in the dark.</li>
          <li>Green wings only make sense against living leaves.</li>
        </ul>
        <p>Each possible habitat gets a score, the best match wins, and the text is assembled from this moth's own numbers instead of picked from a list, so two moths rarely read alike. The same moth always produces the same text, and the last section tells you how much of it is educated guesswork.</p>`
    },
    {
      title: 'The quiz and the optional AI moth',
      body: `
        <p>The quiz turns your answers into a moth with a fixed set of rules: gentle answers give rounded, fuzzy, pastel moths, while bold answers give sharp, saturated, high-contrast ones. Same answers, same moth.</p>
        <p>There is also an optional step that sends your answers to an AI model to redesign the moth as a portrait of you. It needs your own OpenRouter key, which stays in your browser, or you can copy the prompt into any chatbot and paste its reply back. AI results can vary, so the app saves a result once you have one.</p>`
    },
    {
      title: 'Saving and sharing',
      body: `
        <ul>
          <li><b>Save SVG</b> gives a sharp drawing that stays crisp at any size, good for printing or editing in a design app.</li>
          <li><b>Save PNG</b> gives an ordinary picture file for messages and slides.</li>
          <li><b>Save rig SVG</b> splits the moth into named parts (wings, body, antennae) with adjustable colours, so other tools can animate or recolour it. The screensaver uses this.</li>
          <li><b>The JSON box</b> on the Species tab holds every setting as text. Copy it to keep a moth forever, or paste one in and press Apply JSON to bring it back.</li>
        </ul>`
    },
    {
      title: 'The screensaver',
      body: `
        <p>The screensaver page loads the same moths and lets them drift around a scene with the time and weather. Click a moth to see what it is up to and open its <b>Where it lives</b> note, written by the same ecology engine as the Ecology tab.</p>`
    },
    {
      title: 'What to expect from it',
      body: `
        <p>A design toy with real biology behind its reasoning. Don't use it to identify a moth you found: the habitat writing is a guess from shape and colour. Some of the research behind it comes from butterflies, and the link between colour and diet or season is weak. Read the Ecology tab as one plausible life for this exact moth. Change a colour or a wing and the story may shift.</p>`
    }
  ];

  const SUMMARY = `
    <p class="info-lead">The Moth Generator draws a moth from a set of numbers: wing shape, colours, markings, body and antennae. Change a number and the picture changes. The same numbers always give the same moth.</p>
    <p>Once you have a moth you like, the <b>Ecology</b> tab reads it like a naturalist and writes up where it probably lives, when it flies and how it stays alive. Give it a real <b>wingspan</b> and that writing gets sharper. Open any section below for the details.</p>`;

  function html() {
    return SUMMARY + SECTIONS.map(s => `<details class="info-sec"><summary>${s.title}</summary><div class="info-body">${s.body}</div></details>`).join('');
  }

  root.MothInfo = { html, sections: SECTIONS };
})(typeof window !== 'undefined' ? window : globalThis);
