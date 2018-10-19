### The Problem We're trying to solve
When working with Legacy code one of the main problems is we do not have tests. To start refactoring code we better have tests to let us do it with calm.
While integration tests are good, unit tests are much better. Integration tests take a long time and a complicated environment (if that's not the case for you - use the integration tests). Unit tests are fast and do not need any special environment. When we code we run our unit tests every 2-3 minutes if not more, and it takes them under a second to complete.
Writing unit tests for legcy code isn't easy. One of the problems is that the code is usually entangled in many other pieces of code, which makes harnessing it inot a unit tests very difficult.
The problem we're trying to solve here is to help harnessing legacy code into a unit test.

### Runtime Spies - Javascript
The Runtime Spies are pieces of code you add to your code (on a side branch - this doesn't go into production) which capture traffic going into and out of the code you want to test (is it one function? A set of function? That's for you to decide).
After adding the code you run scenarios in the integration environenment. The Runtime spies capture the traffic and produce a harness for the unit test.

Then you should start refactoring.

## Main Features
- Capture the arguments sent into a function and producing code that will call your functioin with the same arguments
- Capture data going into and out of global functions and producing code for the harness that will imitate these functions
- Capture global variables data (also if they change due to global variables) and produce harness code to simulate them
- When capturing global variables / arguments (same) the tool knows to handle cyclic reference and when it stumbles upon member functions is tracks them

### example (see explanation below)
This is taken from one unit test from the project. You need to require RuntimeSpy.js for it to work.
GLobal variables:
```js
var helper1 = function (x) {

    globalVar = 2 * x
    return 2 * x
}
var helper2 = function (x) { return 3 * x }
var globalVar = 5
var globalVar2 = { 1: 6, 2: 2 }
var b = { 1: 1, 2: globalVar2 }
globalVar2['3'] = b
globalVar2['4'] = { 1: 4, 12: function (x) { return 5 * x } }
```
The function we want to harness:
```js
var testFunction = function (A) {
    helper1(21)
    var a = globalVar2['4']['12'](3)
    var result = a+helper1(A) + helper2(A) + globalVar + globalVar2['3']['2']['1'] + globalVar2['4']['12'](4)
    
    return result
}   
```
We add our code to the function
```js
 
var testFunction = function (A) {
            
    // We've added the following lines to generate the harness
    var mySpy = new RuntimeSpy('mySpy') //the main spy object
    mySpy.setTestFunctionCall("testFunction(A)") //setting how to call the test function
    eval(mySpy.addGlobalVariablesSpies({ A: A, globalVar: globalVar, globalVar2: globalVar2, helper1: helper1, helper2: helper2 }).getCodeToEvalToSpyOnVariables()) //spying on variables
    //end of setup
    
    helper1(21)
    var a = globalVar2['4']['12'](3)
    var result = a+helper1(A) + helper2(A) + globalVar + globalVar2['3']['2']['1'] + globalVar2['4']['12'](4)

    mySpy.addFinalResult(result) //here we tell the spy what is the end result so it can later assert on it
    harness = mySpy.getHarness() //generating the harness

    return result
}

```
Now we run the function with our code in it. And this is the harness the RuntimeSpy generates:
```js
var myHarness = new Harness('myHarness') //the main object managing the operation
var mockRepositoryData = {} //This is the "database" of the mock functions
mockRepositoryData['globalVar2[\'4\'][\'12\']'] = {input:[[3],[4]],output:[15,20]}
mockRepositoryData['helper1'] = {input:[[21],[5]],output:[42,10]}
//helper1 was called twice. At the first time there was one input, 21, and the output was 42. At the second time it was 5 and 10.
mockRepositoryData['helper2'] = {input:[[5]],output:[15]}
myHarness.setMockRepositoryData(mockRepositoryData)
//load the harness object with this information

A_DB = new Map([['Initial','A = 5']]) //"database" for global variable A. It had one value throughout the program's run: 5
var A
myHarness.addGlobalVariableMock('A',A_DB) //load A to the harness object

globalVar_DB = new Map([['Initial','globalVar = 5'],['helper1_0','globalVar = 42'],['helper1_1','globalVar = 10']])
var globalVar
myHarness.addGlobalVariableMock('globalVar',globalVar_DB)

globalVar2_DB = new Map([['Initial','globalVar2 = {1:6,2:2,3:{1:1},4:{1:4,12:function(){}}};globalVar2[\'3\'][\'2\']=globalVar2']])
var globalVar2
myHarness.addGlobalVariableMock('globalVar2',globalVar2_DB)

myHarness.updateVariablesByTag('Initial',function(codeToEval){eval(codeToEval)})
//Here, the global variables (A, globalVar and globalVar2 are updated to to have the first value (tag == "Initial"))

myHarness.addFunctionMock('globalVar2[\'4\'][\'12\']')
//loading the global function, globalVar2['4']['12'] to the harness object. The below is the definition of the function
globalVar2['4']['12']= function(){
    var returnValue =  myHarness.callFunctionSpy('globalVar2[\'4\'][\'12\']',arguments,function(codeToEval){eval(codeToEval)})
    if (returnValue!='NOVALUERETURNED')return eval(returnValue)
}

myHarness.addFunctionMock('helper1')
helper1= function(){
    var returnValue =  myHarness.callFunctionSpy('helper1',arguments,function(codeToEval){eval(codeToEval)})
    if (returnValue!='NOVALUERETURNED')return eval(returnValue)
}

myHarness.addFunctionMock('helper2')
helper2= function(){
    var returnValue =  myHarness.callFunctionSpy('helper2',arguments,function(codeToEval){eval(codeToEval)})
    if (returnValue!='NOVALUERETURNED')return eval(returnValue)
}

expect(VariableLiteral.getVariableLiteral(testFunction(A)).getLiteralAndCyclicDefinition('result')).equals('result = 76')
//here the program is called and the result is asserted
```
### Known Limitations
When we set out to do this we thought the process would be completely automated: add one line of code, get a harness.
Unfortunately it doesn't work like this.
As we plowed our way through javascript we found more and more cases we should handle.
For instance there is the not-so-complicated case where a global function returns a function. it sounded reasonable we should spy on that function and we nearly made it but it got complicated and even more complicated so we said no.
And there other probably more cases we didn't think about.
So, the point is you will get a harness, once you decide where is your starting point and where is the end point. The nice thing is that you get code. Once you have the code, the harness, you can start tweaking it! This tool will give you a good starting point and you can take it from there.


Contact me for any querie or comment: yaki.koren@gmail.com OR yaki@agilesparks.com

#### copyright notice

Copyright (C) 2018 Yaki Koren
 
Redistribution, modification and use of this source code is allowed. You do need to mention the copyright.
This software is intended to be used in a test environment only.
