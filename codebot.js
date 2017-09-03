/* Ａ Ｓ Ｃ Ｅ Ｎ Ｄ */

function IsCharSymbol(char) {
	return (
		   char == "}"
		|| char == "{"
		|| char == ")"
		|| char == "("
		|| char == ","
		|| char == "+"
		|| char == "-"
		|| char == "*"
		|| char == "/"
		|| char == "="
		|| char == ":"
		|| char == "!"
		|| char == "."
		|| char == ";"
	);
}

function IsCharKeyword(char) {
	return /^[a-zA-Z]+$/.test(char) || char == "_";
}

function IsCharNumber(char) {
	var good = true;
	for (var i = 0; i < char.length; i++) {
		if (["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(char[i])) {
			// shhh
		} else {
			good = false;
		}
	}
	return good;
}


class Token {
	constructor(name, val, raw) {
		this.name = name;
		this.value = val;
		this.raw = raw;
	}
	
	toString() {
		var rval = this.raw;
		if (rval == "\n") rval = "\\n";
		return `Token${this.name}('${rval}', ${this.value})`;
	}
}

Token.Number = class extends Token {
	constructor(raw) {
		super("Number", parseFloat(raw), raw);
	}
};

Token.String = class extends Token {
	constructor(raw) {
		super("String", raw, raw);
	}
};

Token.Keyword = class extends Token {
	constructor(raw) {
		super("Keyword", raw, raw);
	}
};

Token.Comment = class extends Token {
	constructor(raw) {
		super("Comment", raw.trim(), raw);
	}
};

Token.Flag = class extends Token {
	constructor(raw) {
		var data = {
			key: "value"
		};
		super("Flag", data, raw);
	}
};

Token.Symbol = class extends Token {
	constructor(raw) {
		var val = null;
		if (raw == "{") val = Token.Symbol.Open;
		if (raw == "}") val = Token.Symbol.Close;
		if (raw == "(") val = Token.Symbol.OpenEval;
		if (raw == ")") val = Token.Symbol.CloseEval;
		if (raw == ",") val = Token.Symbol.Comma;
		if (raw == "+") val = Token.Symbol.Add;
		if (raw == "-") val = Token.Symbol.Subtract;
		if (raw == "*") val = Token.Symbol.Multiply;
		if (raw == "/") val = Token.Symbol.Divide;
		if (raw == "=") val = Token.Symbol.Equals;
		if (raw == ":") val = Token.Symbol.Colon;
		if (raw == "!") val = Token.Symbol.Exclaim;
		if (raw == ".") val = Token.Symbol.Period;

		super("Symbol", val, raw);
	}
	
	static get Open()      { return "open"; }
	static get Close()     { return "close"; }
	static get OpenEval()  { return "openeval"; }
	static get CloseEval() { return "closeeval"; }
	static get Comma()     { return "comma"; }
	static get Add()       { return "add"; }
	static get Subtract()  { return "subtract"; }
	static get Multiply()  { return "multiply"; }
	static get Divide()    { return "divide"; }
	static get Equals()    { return "equals"; }
	static get Colon()     { return "colon"; }
	static get Exclaim()   { return "exclaim"; }
	static get Period()    { return "period"; }
};

Token.Constant = class extends Token {
	constructor(raw) {
		super("Constant", raw, raw);
	}
}

Token.EOL = class extends Token {
	constructor(raw) {
		super("EOL", raw, raw);
	}
};


class Statement {
	constructor(args, params) {
		this.args = args;
		this.params = params;
	}
	
	toString() {
		return `Statement([${this.args}], [${this.params}])`;
	}
}


function ParseToTokens(raw) {
	var tokens = [];
	var i = 0;

	raw = raw.split("/*").join("@");
	raw = raw.split("*/").join("@");

	while (i < raw.length) {
		var start_char = raw[i];
		var current = "";
		var type = "";

		if (start_char == "@") {
			i++;
			type = "comment";
			while (raw[i] != "@") {
				current += raw[i];
				i++;
			}
		}

		if (start_char == "'") {
			i++;
			type = "string";
			while (raw[i] != "'") {
				current += raw[i];
				i++;
			}
		}

		if (IsCharNumber(start_char)) {
			type = "number";
			while (IsCharNumber(raw[i]) || raw[i] == ".") {
				current += raw[i];
				i++;
			}
			i--;
		}
		
		if (IsCharKeyword(start_char)) {
			type = "keyword";
			while (IsCharKeyword(raw[i]) || IsCharNumber(raw[i])) {
				current += raw[i];
				i++;
			}
			i--;
		}
		
		if (start_char == "$") {
			type = "constant";
			i++;
			while (IsCharKeyword(raw[i]) || IsCharNumber(raw[i])) {
				current += raw[i];
				i++;
			}
			i--;
		}
		
		if (IsCharSymbol(start_char)) {
			type = "symbol";
			current = start_char;
		}
		
		if (start_char == ";") {
			type = "eol";
			current = start_char;
		}

		if (type == "comment")  tokens.push(new Token.Comment(current));
		if (type == "string")   tokens.push(new Token.String(current));
		if (type == "number")   tokens.push(new Token.Number(current));
		if (type == "keyword")  tokens.push(new Token.Keyword(current));
		if (type == "constant") tokens.push(new Token.Constant(current));
		if (type == "symbol")   tokens.push(new Token.Symbol(current));
		if (type == "eol")      tokens.push(new Token.EOL(current));
		
		i++;
	}
	
	for (var k = 0; k < tokens.length; k++) {
		var tok = tokens[k];
		var nxt = tokens[k+1];
		
		var c1 = tok instanceof Token.Symbol;
		var c2 = tok.value == Token.Symbol.Subtract;
		var c3 = nxt instanceof Token.Number;
		
		if (c1 && c2 && c3) {
			nxt.value *= -1;
			nxt.raw = tok.raw + nxt.raw;
			tokens.splice(k, 1);
		}
	}
	
	for (var j = 0; j < tokens.length; j++) {
		var tokn = tokens[j];

		if (tokn instanceof Token.Comment) {
			tokens.splice(j, 1);
		}
	}

	return tokens;
}


function ParseToStatements(tokens) {
	var basic_statements = [];
	var statements = [];
	var i = 0;
	
	while (i < tokens.length) {
		var current = [];
		
		if (!(tokens[i] instanceof Token.EOL)) {
			while (!(tokens[i] instanceof Token.EOL) && tokens[i]) {
				current.push(tokens[i]);
				i++;
			}
		}

		basic_statements.push(current);
		
		i++;
	}

	basic_statements.forEach(function(basic) {
		var args = [];
		var params = [];
		
		var param_seg = [];
		
		for (var j = 0; basic[j] instanceof Token.Keyword; j++) {
			args.push(basic[j].value);
		}
		
		var output = false;
		basic.forEach(function(tok) {
			if (tok instanceof Token.Symbol && tok.value == Token.Symbol.Close) {
				output = false;
			}

			if (output) {
				param_seg.push(tok);
			}

			if (tok instanceof Token.Symbol && tok.value == Token.Symbol.Open) {
				output = true;
			}
		});

		var current = [];		
		param_seg.forEach(function(tok) {
			if (tok instanceof Token.Symbol && tok.value == Token.Symbol.Comma) {
				params.push(current);
				current = [];
			} else {
				current.push(tok);
			}
		});
		if (current.length > 0) params.push(current);
		
		var stat = new Statement(args, params);
		statements.push(stat);
	});

	return statements;
}


function CompileEvaluate(tokens) {
	var eval_code = "";
	tokens.forEach(function(thing) {
		if (thing instanceof Token.Constant) {
			var name;
	
			if (IsCharNumber(thing.value)) {
				name = "arg" + thing.value;
			} else if (thing.value == "value") {
				name = "inp";
			} else {
				name = "CONST_" + thing.value;
			}
			
			eval_code += name;
		}
		if (thing instanceof Token.Number) {
			eval_code += thing.value.toString();
		}
		if (thing instanceof Token.Symbol) {
			eval_code += thing.raw;
		}
	});
	
	return eval_code;
}

function CompileStatements(statements) {
	var source_pragmas = "";
	var source_constants = ""
	var source_functions = "";
	var source_inputs = "";
	var source_main_init = "";
	var source_main_start = "";
	var source_main_mid = "";
	var source_main_end = "";
	
	source_constants += "/* Compiled from CodeBot3, language by William Gardner of Team 6374 */\n";
	source_constants += "/* For more info, see https://github.com/wg4568/CodeBot3/ */\n";

	statements.forEach(function(statement) {
		
		if (statement.args[0] == "function") {
			var name = statement.args[1];
			var code = "";
			var amt = -1;

			if (name == "start") source_main_init += "FUNC_start();\n";
			if (name == "frame") source_main_mid += "FUNC_frame();\n";

			statement.params.forEach(function(param) {
				param.forEach(function(tok) {
					var c1 = tok instanceof Token.Constant;
					var c2 = IsCharNumber(tok.value);
					if (c1 && c2) {
						var val = parseInt(tok.value);
						if (val > amt) amt = val;
					}
				});
			});

			statement.params.forEach(function(param) {
				var line;
				
				if (param[0].value == "set") {
					var target = param[1];
					var eval_code = CompileEvaluate(param.slice(2));

					if (target instanceof Token.Constant) {
						line = "CONST_" + target.value + " = " + eval_code + ";\n";
					} else {
						line = "motor[MOTOR_" + target.value + "] = " + eval_code + ";\n";
					}
				}

				if (param[0].value == "pause") {
					var eval_code = CompileEvaluate(param.slice(1));
					
					line = "wait1Msec(" + eval_code + ");\n";
				}

				if (param[0].value == "call") {
					var func = param[1].value;
					var args = param.slice(2);

					line = "FUNC_" + func + "(";
					
					args.forEach(function(arg, ind) {
						if (ind != 0) line += ",";
						line += CompileEvaluate([arg]);
					});
					
					line += ");\n";
				}
				
				if (param[0].value == "define") {
					var name = "CONST_" + param[1].value;
					var eval_code = CompileEvaluate(param.slice(2));
					
					line = "float " + name + " = " + eval_code + ";\n";
				}

				code += line;
			});
			
			var param_str = "";
			
			for (var i = 0; i <= parseInt(amt); i++) {
				if (i != 0) param_str += ","
				param_str += "arg" + i;
			}
			
			source_functions += `void FUNC_${name}(${param_str}) {\n${code}}\n`;
		}
		
		if (statement.args[0] == "motor") {
			var name = "MOTOR_" + statement.args[1];
			var type = "vex393";
			var reversed = false;
			var port = 0;
			
			statement.params.forEach(function(param) {
				if (param[0].value == "port") port = param[1].value;
				if (param[0].value == "type") type = param[1].value;
				if (param[0].value == "reversed") reversed = param[1].value == "true";
			});
			
			var mode_string;
			var reversed_string;

			if (type == "vex393") mode_string = "tmotorVex393_HBridge";
			else if (type == "vex293") mode_string = "TODO";
			else mode_string = "UNSUPPORTED";

			if (reversed) reversed_string = ",reversed";
			else reversed_string = "";
			

			source_pragmas += `#pragma config(Motor,port${port},${name},${mode_string},openLoop${reversed_string})\n`;
		}

		if (statement.args[0] == "input") {
			var name = statement.args[1];
			var type = "analog";
			var port = "1";
			
			statement.params.forEach(function(param) {
				if (param[0].value == "port") port = param.slice(1).map(function(p) {return p.value}).join("");
				if (param[0].value == "type") type = param[1].value;
			});
			
			var inp_name;
			
			if (type == "analog") inp_name = "Ch";
			else inp_name = "Btn";
			
			inp_name += port;
			
			source_constants += `float CONST_${name} = 0;\n`;
			source_inputs += `void INPUT_${name}() {\nCONST_${name} = vexRT[${inp_name}];\n}\n`;
			source_main_start += `INPUT_${name}();\n`;
		}
		
		if (statement.args[0] == "variable") {
			var name = statement.args[1];
			var value = CompileEvaluate(statement.params[0].slice(1));
			
			source_constants += "float CONST_" + name + " = " + value + ";\n";
		}
	});
	
	var source_main = `task main() {\nwhile (true) {\n${source_main_start}${source_main_mid}${source_main_end}}\n}`;

	return (source_pragmas
			+ source_constants
			+ source_functions
			+ source_inputs
			+ source_main);
}


function CodeBot3(raw) {
	var tokens = ParseToTokens(raw);
	var statements = ParseToStatements(tokens);
	var code = CompileStatements(statements);
	
	return code;
}
