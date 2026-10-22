const { src, dest, watch, series, parallel } = require("gulp"); // Gulpの基本関数をインポート
const sass = require("gulp-sass")(require("sass")); // SCSSをCSSにコンパイルするためのモジュール
const sassGlob = require("gulp-sass-glob-use-forward"); // SCSSのインポートを簡略化するためのモジュール
const mmq = require("gulp-merge-media-queries"); // メディアクエリをマージするためのモジュール
const postcss = require("gulp-postcss"); // CSSの変換処理を行うためのモジュール
const autoprefixer = require("autoprefixer"); // ベンダープレフィックスを自動的に追加するためのモジュール
const cssdeclsort = require("css-declaration-sorter"); // CSSの宣言をソートするためのモジュール
const postcssPresetEnv = require("postcss-preset-env"); // 最新のCSS構文を使用可能にするためのモジュール
const babel = require("gulp-babel"); // ES6+のJavaScriptをES5に変換するためのモジュール
const browserSync = require("browser-sync"); // ブラウザの自動リロード機能を提供するためのモジュール

// 読み込み先
const srcPath = {
  css: "../src/sass/**/*.scss",
  js: "../src/js/**/*",
  img: "../src/images/**/*",
  html: ["../src/**/*.html", "!./node_modules/**"],
};

// html反映用
const destPath = {
  all: "../dist/**/*",
  css: "../dist/assets/css/",
  js: "../dist/assets/js/",
  img: "../dist/assets/images/",
  html: "../dist/",
};

const browsers = ["last 2 versions", "> 5%", "ie = 11", "not ie <= 10", "ios >= 8", "and_chr >= 5", "Android >= 5"];

// HTMLファイルのコピー
const htmlCopy = () => {
  return src(srcPath.html).pipe(dest(destPath.html));
};

const cssSass = () => {
  // ソースファイルを指定
  return (
    src(srcPath.css, { sourcemaps: true })
      // Sassのパーシャル（_ファイル）を自動的にインポート
      .pipe(sassGlob())
      // SassをCSSにコンパイル
      .pipe(
        sass.sync({
          includePaths: ["src/sass"],
          outputStyle: "expanded", // コンパイル後のCSSの書式（expanded or compressed）
        })
      )
      // ベンダープレフィックスを自動付与
      .pipe(
        postcss([
          postcssPresetEnv(),
          autoprefixer({
            grid: true,
          }),
        ])
      )
      // CSSプロパティをアルファベット順にソートし、未来のCSS構文を使用可能に
      .pipe(
        postcss([cssdeclsort({
          order: "alphabetical"
        })]
        ),
        postcssPresetEnv({ browsers: 'last 2 versions' })
      )
      // メディアクエリを統合
      .pipe(mmq())
      // コンパイル済みのCSSファイルを出力先に保存
      .pipe(dest(destPath.css, { sourcemaps: "." }))
  );
};

// 画像圧縮
const imgImagemin = async () => {
  const { optimizeImages } = await import("./scripts/optimize-images.mjs");
  await optimizeImages("../src/images", destPath.img);
};

// js圧縮
const jsBabel = () => {
  // JavaScriptファイルを指定
  return (
    src(srcPath.js, { encoding: false })
      // Babelでトランスパイル（ES6からES5へ変換）
      .pipe(
        babel({
          presets: ["@babel/preset-env"],
        })
      )
      // 圧縮済みのファイルを出力先に保存
      .pipe(dest(destPath.js))
  );
};

// ブラウザーシンク
const browserSyncOption = {
  notify: false,
  listen: "127.0.0.1",
  open: false,
  ui: false,
  online: false,
  server: "../dist/",
};
const browserSyncFunc = () => {
  browserSync.init(browserSyncOption);
};
const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

// ファイルの削除
const clean = () => {
  return require("node:fs/promises").rm(require("node:path").resolve(__dirname, "../dist"), { recursive: true, force: true });
};
// ファイルの監視
const watchFiles = () => {
  watch(srcPath.css, series(cssSass, browserSyncReload));
  watch(srcPath.js, series(jsBabel, browserSyncReload));
  watch(srcPath.img, series(imgImagemin, browserSyncReload));
  watch(srcPath.html, series(htmlCopy, browserSyncReload));
};

// ブラウザシンク付きの開発用タスク
exports.default = series(series(cssSass, jsBabel, imgImagemin, htmlCopy), parallel(watchFiles, browserSyncFunc));

// 本番用タスク
exports.build = series(clean, cssSass, jsBabel, imgImagemin, htmlCopy);
