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
 * @arg fastskip
 * @type boolean
 * @text IF,While,Jump...
 * 
 * @help This plugin will speed up your game!
 */
/*:ja
 * @plugindesc FastMZ RPGツクールMZ高速化プラグイン
 * @target MZ
 * @author うなうなぎ
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
 * 　イベント処理でスクリプトを使うと、内部的にはevalを使っています。
 * 　具体的には、グローバル変数を新しく作るような処理は無理なはずです。
 * 　その代わりセキュリティが向上し、変数へのアクセス速度が全体的に上がります。
 * 
 * 　そして1度呼び出したスクリプトはキャッシュしてあるので、2回目以降はかなり速くなります。
 * 　だいたい数倍程度、スクリプトの内容によっては100倍ぐらい高速化することもあります。
 * 
 * 　とはいえ使いまわしてもそれなりの時間はかかるし、変数1つ変えるぐらいならイベントの方が速いです。
 * 　最速にするなら、中身をプラグインにして、プラグインコマンドで呼び出すのが良いと思います。
 * 
 * 　×戦闘中のダメージ計算式
 * 　×イベントコマンド・ゲーム進行の「変数の操作」で、オペランドに「スクリプト」を使う時
 * 　×イベントコマンド・フロー制御の「条件分岐」で、条件に「スクリプト」を使う時
 * 
 * 　この3箇所にもスクリプトをevalで動かす箇所があるのですが、今のところ非対応です。
 * 　（ある程度対応できる式を限定すれば、動かすことは可能な気がします）
 * 
 * 
 * ■利用規約
 * 
 * 　MITライセンスということ以外に制限はありません。
 * 　商用利用や18禁作品での使用についてもまったく問題ありません。
 */

(function () {
    'use strict';
    const pluginName = 'FastMZ';
    const parameters = PluginManager.parameters(pluginName);

    let enableFastEval = true;
    let enableSkip = true;

    PluginManager.registerCommand(pluginName, "set", args => {
        enableFastEval = (args.fasteval === "true");
        enableSkip = (args.fastskip === "true");
    });


    //汎用のeval高速化-------------------------------------------------------------
    //スクリプトの文字列自体をキーにして、一度生成した関数を保存する
    //objectだと使えない文字とかあって都合が悪いのでMapを使用
    const fastEvalCache = new Map();
    const fastEval = (script) => {
        let f = fastEvalCache.get(script);
        //元のeval関数を上書き
        if (f === undefined) {
            f = new Function(script);
            fastEvalCache.set(script, f);
        }
        return f;
    }

    //イベントコマンド・上級の「スクリプト」の高速化-------------------------------------------------------------
    const _game_interpreter_command355 = Game_Interpreter.prototype.command355;
    const fastCommand355 = function () {
        if (!enableFastEval) {
            _game_interpreter_command355.apply(this, arguments);
        } else {
            //文字列の結合と評価は1度で十分なはず
            //ただしイベントの中身が動的に変わるようなプラグインだと競合しそう
            let cmd = this.currentCommand();
            if (!cmd.evaluated) {
                let cnt = 0
                let script = this.currentCommand().parameters[0] + "\n";
                while (this.nextEventCode() === 655) {
                    this._index++;
                    cnt++;
                    script += this.currentCommand().parameters[0] + "\n";
                }
                //キャッシュにあればそれを使い、なければ新規作成
                cmd.compiled_function = fastEval(script);
                cmd.skip_count = cnt;
                cmd.evaluated = true;
            } else {
                //すでに作ってある関数を流用する
                //イベントを飛ばす処理だけはちゃんとやっておく
                this._index += cmd.skip_count;
            }
            cmd.compiled_function();
        }
        return true;
    };
    Game_Interpreter.prototype.command355 = fastCommand355;

    //イベントコマンド・移動の「移動ルートの設定」の高速化-------------------------------------------------------------
    const fastProcessMoveCommand = function (command) {
        const gc = Game_Character;
        const params = command.parameters;
        if (enableFastEval && (command.code == gc.ROUTE_SCRIPT)) {
            fastEval(params[0])();
        } else {
            _game_character_processMoveCommend.apply(this, arguments);
        }
    };
    const _game_character_processMoveCommend = Game_Character.prototype.processMoveCommand;
    Game_Character.prototype.processMoveCommand = fastProcessMoveCommand;

    //イベント中の分岐を高速化-------------------------------------------------------------
    const fastSkipBranch = function () {
        //スキップのたびに行き先を探すのは無駄な気がするので、1回調べたら後はそのまま
        if (!enableSkip) {
            _game_interpreter_skipBranch.apply(this, arguments);
        }
        let cmd = this.currentCommand();
        if (cmd.skipTarget) {
            this._index = cmd.skipTarget;
        } else {
            while (this._list[this._index + 1].indent > this._indent) {
                this._index += 1;
            }
            cmd.skipTarget = this._index;
        }
    }
    const _game_interpreter_skipBranch = Game_Interpreter.prototype.skipBranch;
    Game_Interpreter.prototype.skipBranch = fastSkipBranch;

    //ラベルジャンプ系の分岐を高速化-------------------------------------------------------------  

    //下準備
    const _game_interpreter_setup = Game_Interpreter.prototype.setup;
    Game_Interpreter.prototype.setup = function (list, eventId) {
        _game_interpreter_setup.apply(this, arguments);
        //下準備だけは高速化無効の時でもやっておく必要がある
        if ("_fastMZ_labelMap" in list) {
            //list側に保存済みならそれを使う
            //ラベル情報記録用。おそらくMapでやるのが一番速いはず
            this.labelMap = list._fastMZ_labelMap;
        } else {
            const map = new Map();
            const list = this._list;
            const len = list.length;
            let i = 0;
            while (i < len) {
                let command = list[i];
                //ラベル記録用
                if (command.code === 118) {
                    map.set(command.parameters[0], i);
                }
                i += 1;
            }
            list._fastMZ_labelMap = map;
            this.labelMap = map;
        }
    };

    // Jump to Label
    const _game_interpreter_command119 = Game_Interpreter.prototype.command119;
    Game_Interpreter.prototype.command119 = function (params) {
        if (!enableSkip) {
            return _game_interpreter_command119.apply(this, arguments);
        }
        const fastJumpPoint = this._list[this._index].fastJumpPoint;
        if (fastJumpPoint !== undefined) {
            const fastJump = this._list[this._index].fastJump;
            for (const indent of fastJump) {
                this._branch[indent] = null;
            }
            this._index = fastJumpPoint;
        } else {
            const labelName = params[0];
            const jumpPoint = this.labelMap.get(labelName);
            if (jumpPoint !== undefined) {
                fastJumpTo(this, jumpPoint);
                //this.jumpTo(jumpPoint);
            }
        }
        return true;
    };

    const fastJumpTo = function (intp, index) {
        const lastIndex = intp._index;
        const startIndex = Math.min(index, lastIndex);
        const endIndex = Math.max(index, lastIndex);
        const fastJump = new Array();
        let indent = intp._indent;
        for (let i = startIndex; i <= endIndex; i++) {
            const newIndent = intp._list[i].indent;
            if (newIndent !== indent) {
                intp._branch[indent] = null;
                fastJump.push(indent);
                indent = newIndent;
            }
        }
        //必要な処理を記録して、次回以降に備える
        intp._list[intp._index].fastJumpPoint = index;
        intp._list[intp._index].fastJump = fastJump;

        intp._index = index;
    };

    //ループ処理で元の位置に戻るのも高速化
    const _game_interpreter_command413 = Game_Interpreter.prototype.command413;
    const fastRepeat = function () {
        if (enableSkip) {
            const now = this._index;
            const command = this.currentCommand();
            const fastJumpPoint = command.fastJumpPoint;
            if (fastJumpPoint !== undefined) {
                this._index = fastJumpPoint;
            } else {
                do {
                    this._index -= 1;
                } while (this.currentCommand().indent !== this._indent);
                command.fastJumpPoint = this._index;
            }
            return true;
        } else {
            return _game_interpreter_command413.apply(this, arguments);
        }
    };
    Game_Interpreter.prototype.command413 = fastRepeat;

    // Break Loop
    const _game_interpreter_command113 = Game_Interpreter.prototype.command113;
    const fastBreakLoop = function () {
        if (!enableSkip) {
            return _game_interpreter_command113.apply(this, arguments);
        }
        const now = this._index;
        const fastJumpPoint = this._list[now].fastJumpPoint;
        if (fastJumpPoint !== undefined) {
            this._index = fastJumpPoint;
        } else {
            let depth = 0;
            while (this._index < this._list.length - 1) {
                this._index++;
                const command = this.currentCommand();
                if (command.code === 112) {
                    depth++;
                }
                if (command.code === 413) {
                    if (depth > 0) {
                        depth--;
                    } else {
                        break;
                    }
                }
            }
            this._list[now].fastJumpPoint = this._index;
        }
        return true;
    };
    Game_Interpreter.prototype.command113 = fastBreakLoop;

    //イベント実行全体の高速化-------------------------------------------------------------
    //特定のイベントに限って連続実行出来るようにする仕組み
    //10%程度は速くなるけど、イベントの動作がおかしくなったりするので、要調整
    /*
    // unknown,comment,if,when,when cancel,else,loop,break,label,jump,switch,variable,self switch,unknown,Repeat Above,Script command
    const allowEventList = [0, 108, 111, 402, 403, 411, 112, 113, 118, 119, 121, 122, 123, 412, 413, 355];
    let allowEventFlag = new Array(1000).fill(false);
    for (let a of allowEventList) {
        allowEventFlag[a] = true;
    }

    //高速化したイベント処理ルーチン
    const _game_interpreter_executeCommand = Game_Interpreter.prototype.executeCommand;
    const fastExecuteCommand = function () {
        if (!$gameSwitches.value(enabledSwitch)) {
            _game_interpreter_executeCommand.apply(this, arguments);
        } else {
            let command = this.currentCommand();
            let i = 0;
            while (i < 10000) {
                i += 1;
                if (command) {
                    this._indent = command.indent;
                    const methodName = "command" + command.code;
                    if (typeof this[methodName] === "function") {
                        if (!this[methodName](command.parameters)) {
                            return false;
                        }
                    }
                    this._index += 1;

                    command = this.currentCommand();
                    if (command) {
                        if (!allowEventFlag[command.code]) {
                            //連続実行に対応してないコマンドが来てる
                            break;
                        }
                    } else {
                        //次が終端
                        break;
                    }
                } else {
                    //終端
                    this.terminate();
                    break;
                }
            }
            //console.log("break point");
        }
        return true;
    };
    Game_Interpreter.prototype.executeCommand = fastExecuteCommand;
    */

})();