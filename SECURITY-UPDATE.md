# 開発環境のセキュリティ更新（2026-10-23）

対象は `template-html-main/_gulp` のローカル開発・ビルド環境。WordPress本体や公開サーバーのPHPは対象外。

## 変更

- Node 24.22.1を`.node-version`で指定し、enginesを修正済み24系へ限定。
- Gulp 5.0.1 / BrowserSync 3.0.4 / postcss-preset-env 11.6.1へ更新。BrowserSyncは127.0.0.1限定、管理UI・自動ブラウザ起動を無効化。
- 古いimagemin/WebP依存をsharp 0.35.5 / SVGO 4.1へ置換。JPEG/PNGの元拡張子とWebPを出力し、EXIF向き・透明度・SVG viewBoxを維持。GIF/WebP/AVIFはコピー。隠しファイルとiCloudプレースホルダーを除外。
- 使用していないプラグインを削除。全依存を実態に合わせてdevDependenciesへ移動。
- OS通知とエラーを握りつぶすplumberを削除。コンパイル失敗は非0で終了。開発監視中も構文エラー時には修正後に再起動が必要。
- Gulp標準のsource mapへ移行。削除処理はNode標準APIでdistだけを対象にする。
- 古いSass glob経由のminimatchを3.1.4以上、gulp-util経由のlodash.templateを4.18.1へ限定override。

## 検証

Node 24.22.1で `npm ci`、`npm test`（3件）、`npm run build`、`npm ls --all` 成功。
画像fixtureは回転、透明度、SVG、GIFコピー、不正画像の失敗を確認。gulp-utilの実呼び出しでtemplate展開とescapeを確認。
実ビルドでHTMLコピー一致、CSS/JS生成、source map JSONを確認。SCSS/JSに一時的な構文エラーを入れた場合の非0終了を個別確認し、fixture削除後のビルド成功を再確認。
Chromeでローカル開発ページの「変更のテスト」表示、横あふれなし、console errorなしを確認。

全依存のnpm audit: **117件（critical 4 / high 51 / moderate 57 / low 5）→9件（high 9）**。
`--omit=dev`は0件。ただしこれは開発依存の除外結果であり、全依存が解消した意味ではない。
残る9件は修正版未公開のbraces 3.0.3に由来するGulp/BrowserSync監視・検索系の推移的指摘。プロジェクト側のglobは固定されており公開HTTPから直接指定する入口はないが、開発環境のリスクがゼロとは言わない。無関係な旧版へのaudit fix --forceは行わない。bracesの修正版公開時に再評価する。

## 適用と制約

- 元の作業フォルダ、共有Node、公開環境を変更していない。PRはマージ・公開承認待ち。
- マージだけでは元のフォルダや実行中のNodeは更新されない。利用時は変更を取り込み、Node 24.22.1以上の24系で`cd template-html-main/_gulp && npm ci`を実行する。
- 開発環境の更新のために公開サイトの再公開は不要。生成物をアップロードする際には別途公開承認と表示確認を行う。
- リポジトリは最小の静的サンプルで、実画像はiCloudプレースホルダーのみ。実画像での見た目の同一性、WordPress上の動作、スマートフォンの画面検証は未実施。画像エンコーダー変更により将来の出力サイズや画質は旧版と同一ではない。
- 既存Sassの非推奨警告は残る。GitHub Actions workflowは存在せず、検証はローカル実施。ソースHTML/JS/Sassを変更していない。
