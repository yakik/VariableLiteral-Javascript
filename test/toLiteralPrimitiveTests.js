var mocha = require('mocha')
var chai = require('chai')
//chai.use(require('chai-as-promised'))
var expect = chai.expect

var VariableLiteral = require('../src/VariableLiteral')


mocha.describe('Primitive Tests', function () {

  mocha.it('null', function () {
    var a = null
    expect((VariableLiteral.getVariableLiteral(a)).getLiteral()).equals('null')
})
  mocha.it('test three numbers', function () {
      expect((VariableLiteral.getVariableLiteral(3)).getLiteral()).equals('3')
  })

  mocha.it('test three numbers, one is a variable', function () {
    var d = 3
    expect((VariableLiteral.getVariableLiteral(d)).getLiteral()).equals('3')
  })

  mocha.it('test three numbers, one is string', function () {
    expect((VariableLiteral.getVariableLiteral('yaki')).getLiteral()).equals('\'yaki\'')
  })

  mocha.it('test three numbers, one is boolean', function () {
    expect((VariableLiteral.getVariableLiteral(true)).getLiteral()).equals('true')
  })

  mocha.it('test three numbers, one is undefined', function () {
    var undefinedVariable
    expect((VariableLiteral.getVariableLiteral(undefinedVariable)).getLiteral()).equals('undefined')
  })

  mocha.it('special characters', function () {
   var a,b
    var myString = '  a = \' aaa \' \n b = \' fff \''
    eval(VariableLiteral.getVariableLiteral(myString).getLiteralAndCyclicDefinition('myVar'))
    //test passes if there's no Syntax Error
  })




})


