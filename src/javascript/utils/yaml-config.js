const fs   = require("fs")
const path = require("path")
const YAML = require("js-yaml")
const {isObject, isArray, keys} = require("lodash")


const normalizeConfig = config => {

	if( !isArray(config) && !isObject(config) ) {
		try {
			return eval(config)	
		} catch (e){
			return config
		}
	}	
	
	if( isArray(config) ) {
		config = config.map( item => normalizeConfig(item))
		return config 	
	}

	if( isObject(config) ) {
		keys(config).forEach( key => {
			config[key] = normalizeConfig(config[key])
		})
		return config
	}

}


module.exports = filename => normalizeConfig ( YAML.load(fs.readFileSync(path.resolve(filename)).toString().replace(/\t/gm, " ")) )