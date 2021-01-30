//=============================================================================
// FastMZ.js
// ----------------------------------------------------------------------------
// (C)2021 unaunagi
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 1.0.0 2021/01/28 初版
// ----------------------------------------------------------------------------
// [Twitter]: https://twitter.com/unaunagi1/
// [GitHub] : https://github.com/unaunagi/
//=============================================================================

/*:
 * @plugindesc FastMZ
 * @target MZ
 * @author unaunagi
 *
 * @arg fasteval
 * @type boolean
 * @text Eval to new Function
 *
 * @base Fs
 * @orderAfter Fs
 *
 * @arg fastskip
 * @type boolean
 * @text IF,While,Jump...
 *
 * @help This plugin will speed up your game!
 *
 * // (C)2021 unaunagi
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
/*:ja
 * @plugindesc FastMZ RPGツクールMZ高速化プラグイン
 * @target MZ
 * @author うなうなぎ
 *
 * @base Fs
 * @orderAfter Fs
 *
 * @command set
 * @text FastMZによる高速化の設定
 * @desc 各機能を有効にするか無効にするか、ゲーム中から設定ができます。デフォルトだと有効です。
 *
 * @arg fasteval
 * @type boolean
 * @text スクリプトイベントの高速化
 * @desc イベントコマンド「スクリプト」と、移動ルートの設定の「スクリプト」を高速化します。
 *
 * @arg fastskip
 * @type boolean
 * @text 条件分岐・ラベルジャンプ等の高速化
 * @desc フロー制御関係の処理を高速化します。コマンド数の多いイベント、ループ回数が多い場合に効果を発揮。
 *
 * @help 変数操作やスクリプトのイベントを色々高速化するプラグインです。
 *
 * 実際に使ってみて速度の確認がしやすいように、プラグインコマンドでONOFFできるようにしてあります。
 * OFFの状態でも一部の処理が入っちゃうので、素の状態よりちょっと遅くなります
 * 全く使わないという場合はプラグイン自体を無効にしてください。
 *
 * まだテスト不足なので上手く動かないケースがあると思います。
 * セーブデータには何も保存してないので、無効にすれば元通りになるはずです。
 * （ゲーム進行が狂った状態でセーブされたデータとかはどうしようもないですが）
 *
 *
 * ■基本方針
 *
 * 1回調べたことは2回調べなくていいんじゃないか？
 * ということで、調べるのに時間がかかる物はなるべく記録して、使い回すようにしました。
 * 具体的には下記の2点です。
 *
 * ・分岐やラベルジャンプの結果を記憶して高速化
 * ・エディタ上に書いたスクリプト(eval)をFunctionへの置き換えて、一度作った関数は使いまわす
 *
 *
 * ■分岐の高速化
 *
 * 条件分岐をするたびに、イベントを1つ1つ見てジャンプ先を探しているようだったので改良しました。
 * ループ系イベントとかが関係してます。
 * 一番速くなってるのはラベルジャンプです。巨大なイベントでやると相当違うはずです。
 *
 * そのかわり、ゲーム中にイベントの並び順が入れ替わったりするような、特殊な状況には対応できません。
 * 前に調べたのと同じ場所に飛ばしてるだけなので。
 * コアスクリプトだとそういうことはなさそうでしたが、プラグインによってはありえるるかも。
 *
 *
 * ■evalからFunctionへの置き換え
 *
 *  イベント処理でスクリプトを使うと、内部的にはevalを使っています。
 *  具体的には、グローバル変数を新しく作るような処理は無理なはずです。
 *  その代わりセキュリティが向上し、変数へのアクセス速度が全体的に上がります。
 *
 *  そして1度呼び出したスクリプトはキャッシュしてあるので、2回目以降はかなり速くなります。
 *  だいたい数倍程度、スクリプトの内容によっては100倍ぐらい高速化することもあります。
 *
 *  とはいえ使いまわしてもそれなりの時間はかかるし、変数1つ変えるぐらいならイベントの方が速いです。
 *  最速にするなら、中身をプラグインにして、プラグインコマンドで呼び出すのが良いと思います。
 *
 *  ×戦闘中のダメージ計算式
 *  ×イベントコマンド・ゲーム進行の「変数の操作」で、オペランドに「スクリプト」を使う時
 *  ×イベントコマンド・フロー制御の「条件分岐」で、条件に「スクリプト」を使う時
 *
 *  この3箇所にもスクリプトをevalで動かす箇所があるのですが、今のところ非対応です。
 *  （ある程度対応できる式を限定すれば、動かすことは可能な気がします）
 *
 *
 * ■利用規約
 *
 * (C)2021 unaunagi
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 *
 * MITライセンスということ以外に制限はありません。
 * 商用利用や18禁作品での使用についても当然問題ありません。
 *
 */

"use strict";
{
  //プラグインの初期化---------------------------------------------------------------------------------
  //import Fs.js
  // eslint-disable-next-line no-undef
  const { P, Z } = Fs;
  const pluginName = Z.pluginName();

  //有効
  let enableFastEval = true;
  let enableSkip = true;

  //プラグインコマンド---------------------------------------------------------------------------------
  //有効無効の設定
  PluginManager.registerCommand(pluginName, "set", (args) => {
    enableFastEval = P.parse(args["fasteval"], P.boolean);
    enableSkip = P.parse(args["fastskip"], P.boolean);
  });
  //----------------------------------------------------------------------------------------------------

  //各種prop--------------------------------------------------------------------------------------------
  const labelProp = Z.extProp(null); //ラベルの場所を記録したMap。listごとにもたせる
  const jumpProp = Z.extProp(null); //次の行き先を記録した整数。commandごとに
  const jumpMatagiProp = Z.extProp([]); //インデントを超えて飛ぶ時に、リセットすべき場所を示した配列。commandごとに
  const functionProp = Z.extProp(null); //スクリプトイベント用
  //----------------------------------------------------------------------------------------------------

  //evalの高速化------------------------------------------------------------------------------------
  const fastEvalCache = new Map();
  const fastEval = (script) => {
    //evalではなくnew Functionを使う
    //一度生成済みの関数は捨てずに使い回す
    //別の場所から呼ばれても、コードが一致してればOK
    let f = fastEvalCache.get(script);
    if (f === void 0) {
      f = new Function(script);
      fastEvalCache.set(script, f);
    }
    return f;
  };

  //Game_Interpreter
  Z.redef(Game_Interpreter.prototype, (base) => ({
    command113() {
      //ループの中断
      if (!enableSkip) return base(this).command113();

      this._index =
        jumpProp.get(this.currentCommand()) ||
        searchBreakPoint(this._index, this._list);
      return true;
    },
    command119(params) {
      //ラベルに向かってジャンプ！
      if (!enableSkip) return base(this).command119(params);
      const list = this._list;
      const command = list[this._index];
      //すでにジャンプ済みデータがあればそれを使う。なければ探す
      const next =
        jumpProp.get(command) ??
        searchLabel(this._index, this._indent, list, params[0]);
      //インデントまたぎの処理
      for (const indent of jumpMatagiProp.get(command)) {
        this._branch[indent] = null;
      }
      this._index = next;
      return true;
    },
    command355() {
      //スクリプトイベント
      if (!enableFastEval) return base(this).command355();
      //文字列の結合と評価は1度で十分なはず
      //ただしイベントの中身が動的に変わるようなプラグインだと競合しそう
      let command = this.currentCommand();
      let next = jumpProp.get(command);
      if (next !== null) {
        functionProp.get(command)();
        this._index = next;
        return true;
      }
      //最初の1回
      let script = this.currentCommand().parameters[0] + "\n";
      while (this.nextEventCode() === 655) {
        this._index++;
        script += this.currentCommand().parameters[0] + "\n";
      }
      let f = fastEval(script);
      f();
      jumpProp.set(command, this._index);
      functionProp.set(command, f);
      return true;
    },
    command413() {
      //ループ処理などで元に戻る時に使われる関数
      if (!enableSkip) return base(this).command413();

      const command = this.currentCommand();
      const next = jumpProp.get(command);
      if (next !== void 0) {
        this._index = next;
        return true;
      }
      do {
        this._index -= 1;
      } while (this.currentCommand().indent !== this._indent);
      jumpProp.set(this._index);
    },
    skipBranch() {
      //ループ脱出などで汎用的に使われる、処理のスキップ
      //スキップのたびに行き先を探すのは無駄な気がするので、1回調べたら後はそのまま
      if (!enableSkip) return base(this).skipBranch();

      let cmd = this.currentCommand();
      if (cmd.skipTarget) {
        this._index = cmd.skipTarget;
      } else {
        while (this._list[this._index + 1].indent > this._indent) {
          this._index += 1;
        }
        cmd.skipTarget = this._index;
      }
    },
  }));

  //Game_Character
  Z.redef(Game_Character.prototype, (base) => ({
    processMoveCommand(command) {
      //イベントコマンド・移動の「移動ルートの設定」の高速化
      if (!enableSkip) return base(this).processMoveCommand(command);

      const gc = Game_Character;
      const params = command.parameters;
      if (command.code == gc.ROUTE_SCRIPT) {
        fastEval(params[0])();
        return true;
      } else {
        return base(this).processMoveCommand(command);
      }
    },
  }));

  //113 ループの中断 補助関数
  const searchBreakPoint = (now, list) => {
    let depth = 0;
    let i = now;
    while (now < list.length - 1) {
      i++;
      if (list[i].code === 112) depth++;
      if (list[i].code === 413) {
        depth--;
        if (depth <= 0) break;
      }
    }
    jumpProp.set(list[now], i);
    return i;
  };

  //ラベルジャンプの補助関数
  //ラベル記録用のMapを作る（数が少ないなら配列が有利かもしれない）
  const makeLabelMap = (list) => {
    //command.codeが118の場合、ラベル名(parameters[0])とindexをペアにして記録
    const map = new Map();
    for (let i = 0; i < list.length; i++) {
      if (list[i].code === 118) {
        map.set(list[i].parameters[0], i);
      }
    }
    labelProp.set(list, map);
    return map;
  };

  //ラベルジャンルの補助関数
  const searchLabel = (lastIndex, nowIndent, list, labelName) => {
    const command = list[lastIndex];

    //記録がない場合
    let map = labelProp.get(list) ?? makeLabelMap(list); //ラベルマップの取得(なければ作る)
    const matagi = [];
    let jumpPoint = map.get(labelName) ?? lastIndex + 1; //ラベルが存在しない時は次へ
    const startIndex = Math.min(jumpPoint, lastIndex);
    const endIndex = Math.max(jumpPoint, lastIndex);

    let indent = nowIndent;
    for (let i = startIndex; i <= endIndex; i++) {
      const newIndent = list[i].indent;
      if (newIndent !== indent) {
        matagi.push(indent);
        indent = newIndent;
      }
    }
    //必要な処理を記録
    jumpProp.set(command, jumpPoint);
    jumpMatagiProp.set(command, matagi);

    return jumpPoint;
  };
}
