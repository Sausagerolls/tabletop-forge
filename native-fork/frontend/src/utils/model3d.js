// model3d.js — loading GM-supplied glTF models for the 3D view.
//
// A GM who builds a world in Blender wants THAT world on the board, not a
// procedural ball tinted to match their sprite. `File > Export > glTF 2.0
// (.glb)` writes one self-contained file carrying meshes, materials and
// textures, which is what the terrain library stores and what this loads.
//
// Two things this module owns, both of which have bitten every naive
// "just call GLTFLoader in the render pass" attempt:
//
//  1. A CACHE, keyed by path. The 3D geometry pass rebuilds on every terrain
//     move, every door, every step a token takes. Re-downloading and
//     re-parsing a 30 MB .glb on each of those would stall the tab. The
//     PARSED scene is cached and every placement gets a clone, so ten
//     asteroids from one model are one download and one parse.
//
//  2. FITTING. A model comes out of Blender at whatever scale its author
//     worked in — a planet might be 1 unit across or 6371000. The board is in
//     feet. So the loaded scene is measured and scaled to the footprint the GM
//     gave the placement, which makes "drag the piece bigger" mean the same
//     thing for a mesh as it does for a sprite.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Marker put on every wrapper this module hands back, so the 3D view's
// teardown pass knows to leave the subtree alone.
//
// This matters more than it looks. `Object3D.clone` copies the node graph but
// SHARES geometries, materials and textures with the master — that sharing is
// the entire value of the cache. The 3D geometry pass disposes everything it
// built on each rebuild, and a rebuild happens every time anyone moves. Let it
// walk into a clone once and it frees the master's GPU buffers out from under
// every other placement, and the model renders black (or not at all) from then
// on. So: clones own nothing, and are dropped by simply being unlinked.
export const SHARED_MODEL_FLAG = 'sharedModel';

// path -> Promise<THREE.Group>. Promises rather than resolved scenes so that
// N placements of the same model made in the same frame share ONE request:
// they all await the same in-flight entry instead of each starting a download.
const modelCache = new Map();

let loader = null;
function getLoader() {
  if (!loader) loader = new GLTFLoader();
  return loader;
}

// Load (or reuse) the parsed scene for a model path, relative to /uploads.
// Resolves to the master scene — callers must clone before adding it to
// anything, since the master is shared and must never be mutated.
export function loadModel(relPath) {
  if (!relPath) return Promise.reject(new Error('no model path'));
  const cached = modelCache.get(relPath);
  if (cached) return cached;
  const p = new Promise((resolve, reject) => {
    getLoader().load(
      `/uploads/${relPath}`,
      (gltf) => resolve(gltf.scene),
      undefined,
      (err) => reject(err),
    );
  }).catch((err) => {
    // Don't cache a failure forever — a model that failed because the server
    // was mid-restart should load on the next rebuild.
    modelCache.delete(relPath);
    throw err;
  });
  modelCache.set(relPath, p);
  return p;
}

// A fresh, independently-transformable copy of a cached model.
//
// SkeletonUtils.clone would be needed for a rigged/animated model; terrain is
// static scenery, so the plain clone is right and avoids pulling in another
// example module. Materials are shared with the master deliberately — that is
// the whole point of the cache — so a caller that wants to tint one instance
// must clone the material itself.
export function cloneModel(scene) {
  return scene.clone(true);
}

// Scale and centre a model so it fills a footprint of `widthFt` × `depthFt`
// standing on (or centred at) the given world position.
//
// Returns the wrapper Group to add to the scene. The model is put inside a
// wrapper rather than transformed directly, so the caller's rotation and
// position apply to a clean frame and don't fight the fit's own offsets.
//
// `heightFt` is optional: pass it to fit the vertical extent too (a cloud
// wants that), leave it out to scale uniformly from the footprint and let the
// model be as tall as it is (a tree, a tower — squashing those is worse than
// letting them overhang their square).
export function fitModel(model, { widthFt, depthFt, heightFt = null, extraScale = 1 }) {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  // A degenerate box (an empty scene, or a model that failed to parse into
  // geometry) would divide by zero and blow the model up to Infinity.
  const sx = size.x > 1e-6 ? widthFt / size.x : 1;
  const sz = size.z > 1e-6 ? depthFt / size.z : 1;
  const sy = heightFt != null && size.y > 1e-6 ? heightFt / size.y : null;
  // Uniform, from the tightest axis: a non-uniform scale distorts the model
  // and — worse — breaks its normals, so a Blender-lit sphere comes out
  // looking creased. Taking the minimum means the model FITS the footprint
  // rather than overflowing it.
  const s = Math.min(sx, sz, ...(sy != null ? [sy] : [])) * (extraScale || 1);

  model.scale.setScalar(s);
  // Recentre on the wrapper's origin so the caller's position means the
  // model's middle, matching how the spheres and rocks are placed.
  //
  // Measured AGAIN after scaling rather than by scaling `centre`. Those two are
  // only the same when the model's own transform is identity: a scale applies
  // to the object's geometry and to its children's offsets, but NOT to the
  // object's own position, so scaling a pre-scale centre overshoots by exactly
  // that offset times s — which for anything exported off-origin in Blender
  // flings it clean out of the scene.
  model.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(model);
  const fittedCentre = new THREE.Vector3();
  const fittedSize = new THREE.Vector3();
  fitted.getCenter(fittedCentre);
  fitted.getSize(fittedSize);
  // The model has no parent yet, so its box is already in wrapper space and
  // its own position is included in that centre — subtracting lands the centre
  // on the origin.
  model.position.sub(fittedCentre);
  wrapper.add(model);
  wrapper.userData[SHARED_MODEL_FLAG] = true;
  wrapper.userData.fitScale = s;
  wrapper.userData.fitSize = fittedSize;
  return wrapper;
}

