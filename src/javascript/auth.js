
const jwt            = require("jsonwebtoken")
const {extend}       = require("lodash")
const config         = require("./utils/yaml-config")("service.msapi.yaml")
const validateSchema = require('yaml-schema-validator')
const { getClient, sqlQuery } = require('service-manti')

let client
const getRequestParams = request => extend({}, request.params, request.query, request.body)

const generateJWT = (user_id) =>{
    return jwt.sign({loggedAt: new Date(), user_id}, config.service.secret_key, {expiresIn: config.service.time_expires})
} 

const manticoreUpdateUrl = process.env.MANTICORE_UPDATE_URL
if(manticoreUpdateUrl){
    config.service.manticore.update_url = manticoreUpdateUrl
}

const schemaAuth = {
    user: {
        email: { type: String, required: true },
        name: { type: String, required: true }
    },
    application:{
        id: { type : String, required: true  }
    }
}

/**
 * @param {Object} req
 * @param {Object} req.auth     Login 
 * @param {String} req.output   Формат відповіді від сервісу 
 * @param {Object} res
 * @return {Promise}
 */
const processLogin = async (req, res) => {
    try{
        const p = getRequestParams(req)
        const schemaErrors = validateSchema(p, { schema: schemaAuth })
        if(schemaErrors.length > 0){
            res.status(400)
            return res.json({message: schemaErrors})
        }
        client = getClient(config.service.manticore.update_url)
        const sql    = `select * from manticore_cluster:users where email = '${p.user.email}';`
        const result = await sqlQuery(sql, client)
        if(!result || result[0].error.length > 0){
            res.status(400)
            return res.json({message: result ? result[0].error: "Error DB"})
        }
        if(result[0].data[0].length === 0){
            res.status(400)
            return res.json({message: "Not found"})
        }
        if(result[0].data[0].name !== p.user.name || result[0].data[0].app_id !== p.application.id){
            res.status(400)
            return res.json({message: "Not found"})
        }
        const loggedAt = new Date()
        const unix   = Math.round(loggedAt / 1000)
        const temp = await sqlQuery(`update manticore_cluster:users set loggedAt = ${unix} where id = ${result[0].data[0].id};`, client)
        if(!temp || temp[0].error.length > 0){
            res.status(400)
            return res.json({message: temp ? temp[0].error: "Error DB"})
        }
        const token = generateJWT(result[0].data[0].id)
        return res.json({token})
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    }
}

/**
 * @param {Object} req
 * @param {String} req.output   Формат відповіді від сервісу 
 * @param {Object} res
 * @return {Promise}
 */
const processLogout = async (req, res) => {
    try{
        client = getClient(config.service.manticore.update_url)
        const logoutAt = new Date()
        const unix   = Math.round(logoutAt / 1000)
        await sqlQuery(`update manticore_cluster:users set logoutAt = ${unix} where id = ${req.user.user_id}`, client)
        return res.json({message: "Success"})
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    }
}

module.exports = [
    {
        method: "post",
        path: "/login",
        handler: processLogin
    },
    {
        method: "post",
        path: "/logout",
        handler: processLogout
    }
]