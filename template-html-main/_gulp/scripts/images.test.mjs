import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { optimizeImages } from './optimize-images.mjs';

test('nested images preserve orientation, alpha, SVG viewBox and copied formats; skip cloud placeholders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wp-demo-images-'));
  try {
    const src = join(root, 'src'), dest = join(root, 'out');
    await mkdir(join(src, 'nested'), {recursive:true});
    await sharp({create:{width:8,height:4,channels:3,background:'red'}}).jpeg().withMetadata({orientation:6}).toFile(join(src,'photo.jpg'));
    await sharp({create:{width:6,height:3,channels:4,background:{r:0,g:255,b:0,alpha:0.5}}}).png().toFile(join(src,'nested','alpha.png'));
    await writeFile(join(src,'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>');
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
    await writeFile(join(src,'pixel.gif'), gif);
    await writeFile(join(src,'.missing.jpg.icloud'),'placeholder');
    await optimizeImages(src,dest);
    for (const name of ['photo.jpg','photo.webp']) {
      const m = await sharp(join(dest,name)).metadata();
      assert.equal(m.width,4); assert.equal(m.height,8);
    }
    for (const name of ['alpha.png','alpha.webp']) assert.equal((await sharp(join(dest,'nested',name)).metadata()).hasAlpha,true);
    assert.match(await readFile(join(dest,'icon.svg'),'utf8'),/viewBox="0 0 10 10"/);
    assert.deepEqual(await readFile(join(dest,'pixel.gif')),gif);
    assert.ok(!(await readdir(dest)).some(n=>n.includes('icloud')));
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('bad images fail the task rather than produce a successful incomplete build', async () => {
  const root=await mkdtemp(join(tmpdir(),'wp-demo-invalid-'));
  try {
    const src=join(root,'src'); await mkdir(src);
    await writeFile(join(src,'bad.png'),'invalid');
    await assert.rejects(optimizeImages(src,join(root,'out')));
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('patched gulp-util template supports the legacy file interpolation and escaping', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const util = require('gulp-util');
  assert.equal(util.template('<%= file.path %>', {file:{path:'fixture.css'}}), 'fixture.css');
  assert.equal(util.template('<%- file.path %>')({file:{path:'<img>'}}), '&lt;img&gt;');
});
