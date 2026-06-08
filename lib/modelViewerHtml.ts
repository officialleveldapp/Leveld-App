/**
 * HTML page that renders `finallevel.glb` via `<model-viewer>`.
 * Loaded from the app cache by BodyModelWebView.
 */

import { STRENGTH_TIERS } from './strengthTiers';

const GLB_FILENAME = 'finallevel.glb';
const SCRIPT_FILENAME = 'model-viewer.min.js';

export type MuscleSlug =
  | 'abs'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'forearms'
  | 'glutes'
  | 'lower_back'
  | 'obliques'
  | 'quads'
  | 'shoulders'
  | 'triceps'
  | 'upper_back';

export const MUSCLE_SLUGS: MuscleSlug[] = [
  'chest',
  'upper_back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
  'glutes',
  'calves',
  'lower_back',
];

export const MUSCLE_DISPLAY_NAMES: Record<MuscleSlug, string> = {
  abs: 'Abs',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  forearms: 'Forearms',
  glutes: 'Glutes',
  lower_back: 'Lower Back',
  obliques: 'Obliques',
  quads: 'Quads',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  upper_back: 'Upper Back',
};

export const MUSCLE_BENCHMARKS: Record<MuscleSlug, string> = {
  abs: 'Plank',
  biceps: 'Barbell Curl',
  calves: 'Standing Calf Raise',
  chest: 'Bench Press',
  forearms: 'Wrist Curl',
  glutes: 'Hip Thrust',
  lower_back: 'Deadlift',
  obliques: 'Russian Twist',
  quads: 'Back Squat',
  shoulders: 'Overhead Press',
  triceps: 'Tricep Dip',
  upper_back: 'Bent-Over Row',
};

export const BODY_MODEL_WEB_FILES = {
  glb: GLB_FILENAME,
  modelViewerScript: SCRIPT_FILENAME,
} as const;

export function buildModelViewerHtml(): string {
  const untrained = STRENGTH_TIERS[0];
  const baseBodyColor = JSON.stringify(untrained.modelColor);
  const baseBodyEmissive = JSON.stringify(untrained.emissive);

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; background: #0f0f10; overflow: hidden; }
      model-viewer {
        width: 100vw;
        height: 100vh;
        --progress-bar-color: #4C91FF;
      }
      #dbg {
        position: fixed; bottom: 4px; left: 4px; right: 4px;
        color: #888; font: 11px monospace; text-align: center;
        pointer-events: none; z-index: 9999;
      }
    </style>
  </head>
  <body>
    <div id="dbg">loading model-viewer script...</div>
    <script>
      function msg(t, d) {
        try { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:t,detail:d})); } catch(e) {}
      }
      function dbg(s) { document.getElementById('dbg').textContent = s; msg('dbg', s); }

      window.onerror = function(m, s, l, c, e) {
        dbg('JS error: ' + m);
      };

      window.addEventListener('unhandledrejection', function(ev) {
        var r = ev.reason;
        var s = (r && (r.message != null ? String(r.message) : String(r))) || '';
        if (/Unable to resolve data for blob|blob:/i.test(s)) {
          try { ev.preventDefault(); } catch (e) {}
        }
      });

      document.addEventListener('dblclick', function(e) { e.preventDefault(); e.stopPropagation(); }, true);
      document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, true);
      document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, true);
      document.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false, capture: true });
    </script>
    <script type="module" src="${SCRIPT_FILENAME}" onerror="dbg('FAILED to load model-viewer script')"></script>
    <model-viewer
      src="${GLB_FILENAME}"
      camera-controls
      disable-zoom
      auto-rotate
      auto-rotate-delay="0"
      rotation-per-second="15deg"
      camera-orbit="0deg 80deg 105%"
      min-camera-orbit="auto auto 105%"
      max-camera-orbit="auto auto 105%"
      shadow-intensity="1"
      exposure="1.2"
      tone-mapping="neutral"
      interaction-prompt="none"
      interpolation-decay="100"
      style="background: #0f0f10; touch-action: none;"
    ></model-viewer>
    <script>
      var originals = {};
      var modelReady = false;
      var BASE_BODY_COLOR = ${baseBodyColor};
      var BASE_BODY_EMISSIVE = ${baseBodyEmissive};
      var BASE_BODY_SELECT_COLOR = [1.0, 1.0, 1.0, 1.0];
      var BASE_BODY_SELECT_EMISSIVE = [0.04, 0.04, 0.045];

      var KNOWN_SLUGS = ${JSON.stringify(MUSCLE_SLUGS)};

      function norm(s) { return s.toLowerCase().replace(/[_\\s\\-]/g, ''); }

      function slugForMat(matName) {
        var mn = norm(matName);
        for (var i = 0; i < KNOWN_SLUGS.length; i++) {
          var sn = norm(KNOWN_SLUGS[i]);
          if (mn.indexOf(sn) !== -1) return KNOWN_SLUGS[i];
        }
        return null;
      }

      function rememberMaterials(mats) {
        originals = {};
        for (var i = 0; i < mats.length; i++) {
          var m = mats[i];
          var ef = m.emissiveFactor;
          var bc = m.pbrMetallicRoughness.baseColorFactor;
          originals[m.name] = {
            emissive: [ef[0], ef[1], ef[2]],
            baseColor: [bc[0], bc[1], bc[2], bc[3]]
          };
        }
      }

      function resetMaterials(mats) {
        for (var i = 0; i < mats.length; i++) {
          var m = mats[i];
          var o = originals[m.name];
          if (!o) continue;
          m.setEmissiveFactor(o.emissive);
          m.pbrMetallicRoughness.setBaseColorFactor(o.baseColor);
        }
      }

      function applyBaseBody(mats) {
        for (var i = 0; i < mats.length; i++) {
          var s = slugForMat(mats[i].name);
          if (!s) {
            mats[i].pbrMetallicRoughness.setBaseColorFactor(BASE_BODY_COLOR);
            mats[i].setEmissiveFactor(BASE_BODY_EMISSIVE);
          }
        }
      }

      /** Non-muscle mesh (torso/limb base) — white reads cleaner next to muted tier muscles. */
      function applyBaseBodySelection(mats) {
        for (var i = 0; i < mats.length; i++) {
          if (!slugForMat(mats[i].name)) {
            mats[i].pbrMetallicRoughness.setBaseColorFactor(BASE_BODY_SELECT_COLOR);
            mats[i].setEmissiveFactor(BASE_BODY_SELECT_EMISSIVE);
          }
        }
      }

      var MUTED_COLOR = [0.85, 0.85, 0.88, 1.0];
      var MUTED_EMISSIVE = [0.08, 0.08, 0.09];

      /** Dim other muscles; keep the selected muscle’s tier (or GLB) colors — no “selection blue”. */
      window.__setSelectionHighlight = function(slug, tierMap) {
        var mv = document.querySelector('model-viewer');
        if (!mv || !mv.model || !modelReady) return;
        var mats = mv.model.materials;
        resetMaterials(mats);
        if (slug) {
          applyBaseBodySelection(mats);
        } else {
          applyBaseBody(mats);
        }
        if (tierMap) {
          for (var t = 0; t < mats.length; t++) {
            var st = slugForMat(mats[t].name);
            if (st && tierMap[st]) {
              var col = tierMap[st];
              mats[t].pbrMetallicRoughness.setBaseColorFactor([col.r, col.g, col.b, col.a]);
              mats[t].setEmissiveFactor([col.er, col.eg, col.eb]);
            }
          }
        }
        if (!slug) return;
        for (var i = 0; i < mats.length; i++) {
          var s = slugForMat(mats[i].name);
          if (s && s !== slug) {
            mats[i].pbrMetallicRoughness.setBaseColorFactor(MUTED_COLOR);
            mats[i].setEmissiveFactor(MUTED_EMISSIVE);
          }
        }
      };

      /** Legacy: focus one muscle without tier data — mute others, leave selection at restored GLB colors. */
      window.__setHighlight = function(slug) {
        var mv = document.querySelector('model-viewer');
        if (!mv || !mv.model || !modelReady) return;
        var mats = mv.model.materials;
        resetMaterials(mats);
        if (!slug) { applyBaseBody(mats); return; }
        applyBaseBodySelection(mats);
        for (var i = 0; i < mats.length; i++) {
          var s = slugForMat(mats[i].name);
          if (s && s !== slug) {
            mats[i].pbrMetallicRoughness.setBaseColorFactor(MUTED_COLOR);
            mats[i].setEmissiveFactor(MUTED_EMISSIVE);
          }
        }
      };

      window.__setMuscleTiers = function(tierMap) {
        var mv = document.querySelector('model-viewer');
        if (!mv || !mv.model || !modelReady) return;
        var mats = mv.model.materials;
        resetMaterials(mats);
        applyBaseBody(mats);
        if (!tierMap) return;
        for (var i = 0; i < mats.length; i++) {
          var s = slugForMat(mats[i].name);
          if (s && tierMap[s]) {
            var c = tierMap[s];
            mats[i].pbrMetallicRoughness.setBaseColorFactor([c.r, c.g, c.b, c.a]);
            mats[i].setEmissiveFactor([c.er, c.eg, c.eb]);
          }
        }
      };

      function waitForMV() {
        var mv = document.querySelector('model-viewer');
        if (!mv || !mv.addEventListener) {
          dbg('waiting for model-viewer element...');
          setTimeout(waitForMV, 200);
          return;
        }
        dbg('');
        mv.addEventListener('load', function() {
          modelReady = true;
          rememberMaterials(mv.model.materials);
          applyBaseBody(mv.model.materials);
          dbg('');
          msg('ready', 'ok');

          var names = [];
          for (var i = 0; i < mv.model.materials.length; i++) {
            names.push(mv.model.materials[i].name);
          }
          msg('materials', names.join(', '));
        });
        mv.addEventListener('error', function(ev) {
          var d = String((ev && ev.detail) || 'unknown');
          dbg('model error: ' + d);
          msg('error', d);
        });
        mv.addEventListener('progress', function(ev) {
          msg('progress', String(Math.round((ev.detail.totalProgress || 0) * 100)));
        });
      }
      waitForMV();
    </script>
  </body>
</html>`;
}
