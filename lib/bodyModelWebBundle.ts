import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';

import { buildModelViewerHtml, BODY_MODEL_WEB_FILES } from './modelViewerHtml';

const GLB_MODULE = require('../assets/models/finallevel.glb');
const MODEL_VIEWER_TXT = require('../assets/body-model-web/model-viewer.min.txt');

let preparePromise: Promise<{ indexUri: string; readAccessDir: string }> | null = null;

export function getBodyModelWebViewBundle(): Promise<{
  indexUri: string;
  readAccessDir: string;
}> {
  if (!preparePromise) {
    preparePromise = prepareBundle();
  }
  return preparePromise;
}

export function warmupBodyModelWebBundle(): void {
  getBodyModelWebViewBundle().catch(() => {});
}

async function prepareBundle(): Promise<{
  indexUri: string;
  readAccessDir: string;
}> {
  const dir = new Directory(Paths.cache, 'body-model-web');
  if (dir.exists) {
    dir.delete();
  }
  dir.create({ intermediates: true, idempotent: true });

  const [glbAsset, mvAsset] = [
    Asset.fromModule(GLB_MODULE),
    Asset.fromModule(MODEL_VIEWER_TXT),
  ];
  await Promise.all([glbAsset.downloadAsync(), mvAsset.downloadAsync()]);

  const glbSrc = glbAsset.localUri;
  const mvSrc = mvAsset.localUri;
  if (!glbSrc || !mvSrc) {
    throw new Error('Bundled body model assets missing localUri');
  }

  const glbDest = new File(dir, BODY_MODEL_WEB_FILES.glb);
  const mvDest = new File(dir, BODY_MODEL_WEB_FILES.modelViewerScript);

  new File(glbSrc).copy(glbDest);
  new File(mvSrc).copy(mvDest);

  const html = buildModelViewerHtml();
  const indexFile = new File(dir, 'index.html');
  indexFile.write(html, { encoding: 'utf8' });

  if (__DEV__) {
    console.log('[BodyModelBundle] prepared', {
      dir: dir.uri,
      index: indexFile.uri,
      glbExists: glbDest.exists,
      glbSize: glbDest.size,
      mvExists: mvDest.exists,
      mvSize: mvDest.size,
      htmlExists: indexFile.exists,
    });
  }

  const indexUri = indexFile.uri;
  return { indexUri, readAccessDir: dir.uri };
}
