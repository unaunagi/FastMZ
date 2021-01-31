# FastMZ
This is a plug-in for RPG Maker MZ.  Speed up your games!

RPGツクールMZ製ゲームを高速化するプラグインです。

イベント処理やスクリプト処理を書き換えることで、だいたい2倍～数倍の高速化が見込めます。
特にイベントコマンドをたくさん使ったり、ループ回数が多い場合には効いてきます。
ただしGame_Interpreterの中身を書き換えるプラグインとは競合する可能性があります。

# プラグインの紹介
## FastMZ.js
Game_Interpreterを中心に高速化を行うプラグインです。  
現バージョンでは **Fs.jsの導入が必須** です。  
プラグインを導入した時点で有効となりますが、プラグインコマンドで切り替えも可能です。
## FastMZTimer.js
FastMZの副産物。実際にどれぐらい時間がかかったのか表示するだけのプラグイン。  
これ単体で動作します。FastMZ.jsやFs.jsは不要です。

# 前提プラグイン
## Fs.js
[MZ用 基本機能ライブラリ Fs （β版） | ツクールフォーラム](https://forum.tkool.jp/index.php?threads/mz%E7%94%A8-%E5%9F%BA%E6%9C%AC%E6%A9%9F%E8%83%BD%E3%83%A9%E3%82%A4%E3%83%96%E3%83%A9%E3%83%AA-fs-%EF%BC%88%CE%B2%E7%89%88%EF%BC%89.4276/)

並び順でFastMZ.jsより上に登録してください。  


# もう少し詳しい説明
[【プラグイン】FastMZ イベント処理全般を高速化します | ツクールフォーラム](https://forum.tkool.jp/index.php?threads/%E3%80%90%E3%83%97%E3%83%A9%E3%82%B0%E3%82%A4%E3%83%B3%E3%80%91fastmz-%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E5%87%A6%E7%90%86%E5%85%A8%E8%88%AC%E3%82%92%E9%AB%98%E9%80%9F%E5%8C%96%E3%81%97%E3%81%BE%E3%81%99.4747/)

(C)2021 unaunagi
This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
