
class VariableLiteral {


	constructor(variable, ancestors, propertyName, path) {
		this.variable = variable


		this.setPropertyName(propertyName)
		this.setPath(path)
		this.setAncestors(ancestors)
	}

	getPath() {
		return this.path
	}
	setPath(path) {
		if (path == undefined)
			this.path = ''
		else
			this.path = path
		if (this.propertyName != '')
			this.path += '[\'' + this.propertyName + '\']'
	}

	setPropertyName(propertyName) {
		this.propertyName = ''
		if (propertyName != undefined)
			this.propertyName = propertyName
	}

	setAncestors(ancestors) {
		if (ancestors != undefined)
			this.ancestors = new Map(ancestors)
		else
			this.ancestors = new Map()
		this.ancestors.set(this.variable, this.path)
	}

	static getVariableLiteral(variable, ancestors, propertyName, path) {
		var newCodeDefinition
		if (variable === null) {
			newCodeDefinition = new NullVariable(variable, ancestors, propertyName, path)
		}
		else {
			if (variable instanceof Map) {
				newCodeDefinition = new MapVariable(variable, ancestors, propertyName, path)
			}
			else {

				if (Array.isArray(variable))
					newCodeDefinition = new ArrayVariable(variable, ancestors, propertyName, path)
				else {
					if (typeof variable == 'object')
						newCodeDefinition = new ObjectVariable(variable, ancestors, propertyName, path)
					else {
						if (typeof variable == 'function')
							newCodeDefinition = new FunctionVariable(variable, ancestors, propertyName, path)
						else
							newCodeDefinition = new PrimitiveVariable(variable, ancestors, propertyName, path)
					}
				}
			}
		}
		return newCodeDefinition
	}

	static getCircularVariable(variable, ancestors, propertyName, path, duplicateAncestorPath) {
		var newCodeDefinition = new CircularVariable(variable, ancestors, propertyName, path)
		newCodeDefinition.setDuplicateAncestorPath(duplicateAncestorPath)
		return newCodeDefinition
	}

	getLiteral() {
		var literal = ''
		if (this.propertyName != '')
			literal += this.propertyName + ':'
		return literal += this.getValueLiteral()
	}

	getLiteralAndCyclicDefinition(variableName) {
		var definition = variableName + ' = ' + this.getLiteral()
		this.getCircularDefinitions().forEach(circularDefinition => {
			definition += ';' + circularDefinition.getCircularDefinition(variableName)
		})
		return definition
	}



	getValueLiteral() { }

	getCircularDefinitions() {
		return []
	}

	getFunctionsDefinitions() {
		return []
	}

}

class PrimitiveVariable extends VariableLiteral {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
	}

	getValueLiteral() {

		switch (typeof this.variable) {
			case 'number':
				return this.variable.toString()
			case 'string':
				return '\'' + this.variable.replace(/\'/g, '\\\'').replace(/\n/g, '\\n') + '\''
			case 'undefined':
				return 'undefined'
			case 'boolean':
				return this.variable ? 'true' : 'false'
			default:
				return 'ERROR!!'
		}
	}
}

class CollectionVariable extends VariableLiteral {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
		this.addChildren()
	}

	getCircularDefinitions() {
		var circularDefinitions = []

		this.children.forEach((child) => {
			circularDefinitions = circularDefinitions.
				concat(child.getCircularDefinitions())
		})
		return circularDefinitions
	}

	getFunctionsDefinitions() {
		var functionDefinitions = []

		this.children.forEach((child) => {
			functionDefinitions = functionDefinitions.
				concat(child.getFunctionsDefinitions())
		})
		return functionDefinitions
	}
}

class MapVariable extends CollectionVariable {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
		this.addChildren()
	}

	getValueLiteral() {
		var literal = 'new Map(['
		this.children.forEach((child, index) => {
			var childLiteral = child.getLiteral()
			if (childLiteral != '') {
				if (index > 0)
					literal += ','
				literal += childLiteral
			}
		})
		literal += '])'
		return literal
	}

	addChildren() {
		this.children = []
		var upperThis = this
		this.variable.forEach((value, key) => {
			if (!upperThis.ancestors.has(value)) {
				upperThis.children.
					push(VariableLiteral.getVariableLiteral(
						[key, value], upperThis.ancestors, undefined, upperThis.path + '.get(' + key + ')'))
			}
			else {
				upperThis.children.
					push(VariableLiteral.getCircularVariable(
						[key, value], upperThis.ancestors, undefined, upperThis.path + '.get(' + key + ')', upperThis.ancestors.get(value)))
			}
		})
	}
}


class ArrayVariable extends CollectionVariable {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
		this.addChildren()
	}

	getValueLiteral() {
		var literal = '['
		this.children.forEach((child, index) => {
			var childLiteral = child.getLiteral()
			if (childLiteral != '') {
				if (index > 0)
					literal += ','
				literal += childLiteral
			}
		})
		literal += ']'
		return literal
	}

	addChildren() {
		this.children = []
		var upperThis = this
		this.variable.forEach((item, index) => {
			if (!upperThis.ancestors.has(item)) {
				upperThis.children.
					push(VariableLiteral.getVariableLiteral(
						item, upperThis.ancestors, undefined, upperThis.path + '[' + index + ']'))
			}
			else {
				upperThis.children.
					push(VariableLiteral.getCircularVariable(
						item, upperThis.ancestors, undefined, upperThis.path + '[' + index + ']', upperThis.ancestors.get(item)))
			}
		})
	}
}


class ObjectVariable extends CollectionVariable {

	addChildren() {
		this.children = []
		var upperThis = this
		//getOwnandPrototypeEnumerablesAndNonenumerables
		var objectProperties = Object.getOwnPropertyNames(this.variable)
		objectProperties.forEach((property, index) => {
			if (!upperThis.ancestors.has(this.variable[property])) {
				upperThis.children.
					push(VariableLiteral.getVariableLiteral(this.variable[property], upperThis.ancestors, property, upperThis.path))
			}
			else {
				upperThis.children.
					push(VariableLiteral.getCircularVariable(
						this.variable[property], upperThis.ancestors, property, this.path, upperThis.ancestors.get(this.variable[property])))
			}
		})
	}

	getValueLiteral() {
		if (this.variable == null) {
			return 'null'
		}
		if (this.variable == undefined) {
			return 'undefined'
		}

		var literal = '{'
		this.children.forEach((child, index) => {
			var childLiteral = child.getLiteral()
			if (childLiteral != '') {
				if (index > 0)
					literal += ','
				literal += childLiteral
			}


			/*	this.children.forEach((child, index) => {
					if (index > 0)
						literal += ','
					literal += child.getLiteral()*/
		})
		literal += '}'
		return literal
	}



}

class FunctionVariable extends VariableLiteral {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
	}


	getValueLiteral() {
		return 'function(){}'
	}

	getFunctionsDefinitions() {

		return [this]
	}

	getFunctionDefinition() {

		return this.variable
	}

}

class NullVariable extends VariableLiteral {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
	}


	getValueLiteral() {
		return 'null'
	}

}

class CircularVariable extends VariableLiteral {
	constructor(variable, ancestors, propertyName, path) {
		super(variable, ancestors, propertyName, path)
	}


	getLiteral() {
		return ''
	}

	getCircularDefinitions() {

		return [this]
	}

	getCircularDefinition(newVariableName) {

		var circularDefinition = newVariableName + this.path + '=' + newVariableName + this.duplicateAncestorPath
		return circularDefinition
	}

	setDuplicateAncestorPath(duplicateAncestorPath) {
		this.duplicateAncestorPath = duplicateAncestorPath
	}

}

module.exports = VariableLiteral

