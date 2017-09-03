# CodeBot3

Revision three of CodeBot, now in JavaScript! You can find all the documentation for writing in CodeBot below.

## Defining a Motor

```
motor <MOTOR_NAME> {
	port <PORT_NUM>,
	type <MOTOR_TYPE>,
	reversed <REVERSED>
};
```

 * MOTOR_NAME - *any string to refer to your motor (required)*
   * Accepted inputs: *any string*
 * PORT_NUM - *the motor port number (required)*
   * Accepted inputs: *numbers 1-10*
 * MOTOR_TYPE - *the type of your motor (default: vex393)*
   * Accepted inputs: *vex393*
 * REVERSED - *is the motor reversed (default: false)*
   * Accepted inputs: *true, false*

**Example Usage**
```
motor drive_left {
	port 6,
	reversed true
};
```

## Defining an Input

```
input <INPUT_NAME> {
	port <PORT_NUM>,
	type <INPUT_TYPE>
};
```

 * INPUT_NAME - *any string to refer to your input (required)*
   * Accepted inputs: *any string*
 * PORT_NUM - *the input port number (required)*
   * Accepted inputs: *numbers 1-4 or digital button keycodes (8U/6D etc.)*
 * INPUT_TYPE - *the type of your input (default: analog)*
   * Accepted inputs: *analog, digital*

Once an input is defined, you can access it's value from anywhere using the $ indicator.

**Example Usage**
```
input arm_up {
	type digital,
	port 8U
};
```

## Defining a Variable

```
variable <VAR_NAME> {
	value <VALUE>
};
```

 * VAR_NAME - *any string to refer to your variable (required)*
   * Accepted inputs: *any string*
 * VALUE - *the initial value of your variable (required)*
   * Accepted inputs: *any float or integer*

The variable created will be accessable from anywhere in your code, including inside functions (ie. it is global).

**Example Usage**
```
variable arm_speed {
	value 85
};
```

## Defining a Function

```
function <FUNC_NAME> {
	<COMMANDS>
};
```

 * FUNC_NAME - *any string to refer to your function (required)*
   * Accepted inputs: *any string*
   * Note that there are three functions with special behaviour, *start, frame,* and *auton* (see: special functions)
 * COMMANDS - *the commands that are to execute when the function is called (required)*
   * Accepted inputs: *any valid commands, seperated with commas (see: commands)*

**Example Usage**
```
function increase_speed {
	set $move_speed $move_speed+10
};
```

## Function Commands

### `set` command

The set command sets the value of a variable or motor.

**Setting a Variable**

```
set $<VAR_NAME> <VALUE>
```

**Setting a Motor**

```
set <MOTOR_NAME> <VALUE>
```

Note the difference between the two is that when referring to a variable, you use the $ indicator.

**Examples**

```
set $arm_speed $arm_base * 3.5
set main_motor $arm_speed
set arm_raise_motor 84.6
```


### `define` command

The define command creates a variable for use within the scope of the function.

**Defining a Variable**

```
define <VAR_NAME> <VALUE>
```

When defining a variable, do not use the $ indicator before the VAR_NAME field.

Also note that the variable created will only exist for the duration of the function call, and will not be accessable from other functions.

### `call` command

The call command calls a function, with parameters.

```
call <FUNC_NAME> <ARG1> <ARG2> <ARG3> ...
```

**Examples**

```
call move_arm $arm_speed 500
call start_auton
call drive_base $left_joy $right_joy
```

**A Warning**

When passing parameters to a function, you can not do the following...

```
call my_function $variable + 4
```

This is because the parser doesn't know when an evaluation ($variable + 4) ends, and the next argument begins. Instead, do...

```
define temp_var $variable + 4,
call my_function $temp_var
```

### `pause` command

The pause command pauses execution for a specific number of milliseconds. This one's pretty self-explanitory.

**Examples**

```
pause $wait_time
pause 1000
pause 50 * $some_var
```

### function arguments

To access the arguments passed by a *call* command, use the $ indicator, followed by a number representing which argument you want to retrieve (starting at 0).

**Example**

Let's say you ran the following code...

```
call my_func 100 35 99
```

Lets say we want to assign each argument (100, 35 and 99) to a motor speed. We would do the following...

```
function my_func {
	set some_motor $0,
	set another_motor $1,
	set last_motor $2
};
```

The `$0` accesses the first argument (computers count from zero!), `$1` the next, etc...

If you call a function and the number of arguments passed doesn't match those that are used within the function, then the generated RobotC code won't compile.

## Special functions

Defining a function with any of these names will cause them to have special functionality, as described below.

### `start` function

Any function named `start` will be called exactly once on the initiation of the script. No arguments will be passed.

### `frame` function

Any function named `frame` will be continuously called for the entirity of the program. If the compiler is in competition mode, then it will run whenever driver control is enabled. The first and only parameter passed will be the "frame number", or how many times the function has been called. This is useful for timekeeping.

### `auton` function

When the compiler is in competition mode, any function named `auton` will be called when the competition controller requests the autonomous stage to be initiated. In regular mode, it acts like a regular function. No arguments are passed.

## Side Notes

 * While it is *technically* possible to a motor with the same name as an input or variable, it is generally a bad idea, and only causes confusion. Try prefixing your variable with *motor_* or *input_* for clarity.
 * Do not name a local (define) variable the same as a variable in the global scope. It *will* break.
 * Putting a *pause* command in the *frame* function is a bad idea. There are very few cases when this will work out for you.
 * While you can put a comma at the end of the last statement in a {} block, it is not required. The same goes for semicolons.
 * As of writing this, CodeBot3 has no syntax validation. It simply expects you to write correctly. Screwing up your syntax will either lead to a scary JavaScript error, or code that simply doesn't work.
 * Comments can be written using /\* and \*/ syntax. Anything between those symbols will be ignored.


## Example Script

The following code describes a four-motor base, and maps two analog inputs to the left and right sides. It also multiplies the input value by $move_multiplier for easy reconfiguring.

```
/* Motor definitions */
motor front_left_base  { port 6 };
motor back_left_base   { port 5 };
motor front_right_base { port 7, reversed true };
motor back_right_base  { port 8, reversed true };

/* Input definitions */
input left_joystick  { type analog, port 1 };
input right_joystick { type analog, port 3 };

/* Variable definitions */
variable move_multiplier { value 1.0 };

/* Sets base speed to first two arguments */ 
function set_base {
	set front_left_base  $0 * $move_multiplier,
	set back_left_base   $0 * $move_multiplier,
	set front_right_base $1 * $move_multiplier,
	set back_right_base  $1 * $move_multiplier
};

/* Call set_base every frame, with inputs as arguments */
function frame {
	call set_base $left_joystick $right_joystick
};
```
