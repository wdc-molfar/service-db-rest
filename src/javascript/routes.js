const {extend}       = require("lodash")
const config         = require("./utils/yaml-config")("service.msapi.yaml")
const validateSchema = require('yaml-schema-validator')
const { getClient, sqlQuery, deleteCall, formatter, insert, update } = require('service-manti')

const SORT_BY = ['ASC', 'DESC']

let client
const getRequestParams = request => extend({}, request.params, request.query, request.body)

const manticoreUrl     = process.env.MANTICORE_URL
if(manticoreUrl){
    config.service.manticore.url = manticoreUrl
}

/**
 * @param {Object} req
 * @param {Number} req.id     Id повідомлення в БД
 * @param {String} req.json   Інфрмація для запису в JSON в БД
 * @param {String} req.output Формат відповіді від сервісу 
 * @param {Object} res
 * @return {Promise}
 */
const updateJson = async (req, res) => {
    try{
        const p = getRequestParams(req)
        if(!p.json){
            res.status(400)
            return res.json({message: `JSON is not define`})
        }
        if(!p.id){
            res.status(400)
            return res.json({message: `Id is not define`})
        }
        const id           = parseInt(p.id);
        const json         = JSON.parse(p.json)
        const schemaErrors = validateSchema(json, { schema: config.service.manticore.message })
        if(schemaErrors){
            res.status(400)
            return res.json({message: schemaErrors})
        }
        client = getClient(config.service.manticore.url)
        let datedAt = json.scraper.message.publishedAt
        if(!datedAt){
            datedAt = json.scraper.message.createdAt
        }
        const publishedAt = datedAt ? new Date(datedAt): new Date()
        const unix   = Math.round(publishedAt / 1000)
        const data   = {"cluster" : "manticore_cluster", "index" : "molfar", "id" : id, "doc":{"title":json.scraper.message.text, "date":unix, "data": formatter(json)}};
        const result = await update(data, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    }  
}

/**
 * @param {Object} req
 * @param {String} req.sql  Запит sql в БД
 * @param {String} req.output Формат відповіді від сервісу 
 * @param {Object} res
 * @return {Promise}
 */
const decodeURIComponent = (code) =>{
    // Split the code into lines
    const lines = code.split('\n');
  
    // Filter out lines starting with --
    const filteredLines = lines.filter(line => !line.trim().startsWith('--'));
  
    // Join the filtered lines back into a string
    const filteredCode = filteredLines.join('\n');
  
    return filteredCode;
}

const sqlRequest = async (req, res) =>{
    try{
        const p = getRequestParams(req)
        if(!p.sql){
            res.status(400)
            return res.json({message: `SQL is not define`})
        }
        let sql = p.sql
        if(p.decode){
            sql = decodeURI(p.sql)
            sql = decodeURIComponent(sql)
        }
        client = getClient(config.service.manticore.url)
        const result = await sqlQuery(sql, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    } 
 }

/**
 * @param {Object} req
 * @param {String} req.json   Інфрмація для запису в JSON в БД
 * @param {String} req.output Формат відповіді від сервісу 
 * @param {Object} res
 * @return {Promise}
 */
const insertJson = async (req, res) => {
    try{
        const p = getRequestParams(req)
        if(!p.json){
            res.status(400)
            return res.json({message: `JSON is not define`})
        }
        const json         = JSON.parse(p.json)
        const schemaErrors = validateSchema(json, { schema: config.service.manticore.message })
        if(schemaErrors){
            res.status(400)
            return res.json({message: schemaErrors})
        }
        client = getClient(config.service.manticore.url)
        let datedAt = json.scraper.message.publishedAt
        if(!datedAt){
            datedAt = json.scraper.message.createdAt
        }
        const publishedAt = datedAt ? new Date(datedAt): new Date()
        const unix   = Math.round(publishedAt / 1000)
        const data   = {"cluster" : "manticore_cluster", "index" : "molfar", "doc":{"title":json.scraper.message.text, "date":unix, "data": formatter(json)}};
        const result = await insert(data, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    }    
}

/**
 * @param {Object} req         Запит до серверу
 * @param {Object} req.query   Запит до БД
 * @param {Object} req.sort    Сортування результатів (за замовченням asc)
 * @param {Object} req.limit   Максимальна кількість результатів у відповіді
 * @param {Object} req.profile {profile: true} // false
 * @param {Object} req._source 
 * @param {Object} res.option  Додаткові опції пошуку
 * @param {Object} res         Відповідь від серверу
 * @return {Promise}
 */
const searchJson = async (req, res) => {
    try{
        const p = getRequestParams(req)
        if(!p.json){
            res.status(400)
            return res.json({message: `JSON is not define`})
        }
        const query         = JSON.parse(p.query)
        const schemaErrors  = validateSchema(query, { schema: config.service.manticore.message })
        if(schemaErrors.length > 0){
            res.status(400)
            return res.json({message: schemaErrors})
        }
        const sort         = p.sort ? JSON.parse(p.sort) : null
        const option       = p.option ? JSON.parse(p.option) : null
        const _source      = p._source ? JSON.parse(p._source) : null
        const limit        = p.limit ? parseInt(p.limit) : null
        const profile      = p.profile ? p.profile : null
        client = getClient(config.service.manticore.url)
        const data   = {"cluster" : "manticore_cluster", "index" : "molfar", query, limit , _source, sort, option, profile};
        const result = await insert(data, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    }    
}

/**
 * @param {Object} req         Запит до серверу
 * @param {Number} req.id      Id повідомлення в БД
 * @param {Object} res         Відповідь від серверу
 * @return {Promise}
 */
const deleteDoc = async (req, res) => {
    try{
        const p = getRequestParams(req)
        if(!p.id){
            res.status(400)
            return res.json({message: `Id is not define`})
        }
        const id     = parseInt(p.id);
        client       = getClient(config.service.manticore.url)
        const data   = {"cluster" : "manticore_cluster", "index" : "molfar", "id" : id};
        const result = await deleteCall(data, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    }  
}
/**
 * @param {Object} req         Запит до серверу
 * @param {String} req.query   Запит до БД
 * @param {String} req.sort    Сортування результатів (за замовченням asc)
 * @param {String} req.limit   Максимальна кількість результатів у відповіді
 * @param {String} req.startAt Дата з якої починати пошук
 * @param {String} req.stopAt  Дата до якої шукати результати
 * @param {Object} res.option  Додаткові опції пошуку
 * @param {Object} res         Відповідь від серверу
 * @return {Promise}
 */
const content = async(req, res) => {
    try{
        const p       = getRequestParams(req)
        const query   = p.query
        const points  = p.limit ? parseInt(p.limit) : null
        const option  = p.option? p.option : ''
        let limit     = ''
        let startAt   = null, stopAt = null
        if(points && points > 0){
            limit = `limit ${points}`
        }
        const sort   = p.sort ? SORT_BY.includes(p.sort) ? p.sort : 'ASC' : 'ASC'
        if(content.startAt){
            startAt = moment(content.startAt).unix()
        }
        if(content.stopAt){
            stopAt = moment(content.stopAt).unix()
        } 
        if(startAt && stopAt){
            const diffDateTime =  Math.floor(stopAt - startAt); 
            if(diffDateTime < 1){
                res.status(400)
                return res.json({message: `Error, DiffDateTime < 1`})
            }
        }
        client       = getClient(config.service.manticore.url)
        let queryToSearch = ''
        if(query || startAt || stopAt){
            if(query){
                queryToSearch = `where MATCH(${query})`
            }
            if(startAt){
                if(queryToSearch.length > 0){
                    queryToSearch+= ` AND date >= ${startAt}`
                }else{
                    queryToSearch+= `where date >= ${startAt}`
                }
            }
            if(stopAt){
                if(queryToSearch.length > 0){
                    queryToSearch+= ` AND date <= ${stopAt}`
                }else{
                    queryToSearch+= `where date <= ${stopAt}`
                }
            }
        }
        const sql    = `select * from manticore_cluster:molfar ${queryToSearch} order by id ${sort} ${limit} ${option}`
        const result = await sqlQuery(sql, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    } 
}
/**
 * @param {Object} req         Запит до серверу
 * @param {String} req.query   Запит до БД
 * @param {String} req.sort    Сортування результатів (за замовченням asc)
 * @param {String} req.limit   Максимальна кількість результатів у відповіді
 * @param {String} req.startAt Дата з якої починати пошук
 * @param {String} req.stopAt  Дата до якої шукати результати
 * @param {Object} res.option  Додаткові опції пошуку
 * @param {Object} res         Відповідь від серверу
 * @return {Promise}
 */
const timeline = async(req, res) => {
    try{
        const p       = getRequestParams(req)
        const query   = p.query
        const points  = p.limit ? parseInt(p.limit) : null
        const option  = p.option? p.option : ''
        let limit     = ''
        let startAt   = null, stopAt = null
        if(points && points > 0){
            limit = `limit ${points}`
        }
        const sort   = p.sort ? SORT_BY.includes(p.sort) ? p.sort : 'ASC' : 'ASC'
        if(content.startAt){
            startAt = moment(content.startAt).unix()
        }
        if(content.stopAt){
            stopAt = moment(content.stopAt).unix()
        } 
        if(startAt && stopAt){
            const diffDateTime =  Math.floor(stopAt - startAt); 
            if(diffDateTime < 1){
                res.status(400)
                return res.json({message: `Error, DiffDateTime < 1`})
            }
        }
        client       = getClient(config.service.manticore.url)
        let queryToSearch = ''
        if(query || startAt || stopAt){
            if(query){
                queryToSearch = `where MATCH(${query})`
            }
            if(startAt){
                if(queryToSearch.length > 0){
                    queryToSearch+= ` AND date >= ${startAt}`
                }else{
                    queryToSearch+= `where date >= ${startAt}`
                }
            }
            if(stopAt){
                if(queryToSearch.length > 0){
                    queryToSearch+= ` AND date <= ${stopAt}`
                }else{
                    queryToSearch+= `where date <= ${stopAt}`
                }
            }
        }
        const sql    = `select YEARMONTHDAY(date) as d, count(*) as count from manticore_cluster:molfar ${queryToSearch} group by d order by d ${sort} ${limit} ${option};`
        console.log(sql)
        const result = await sqlQuery(sql, client)
        return res.send(result)
    }catch(e){
        res.status(500)
        return res.json({message: e.message})
    } 
}
//select count(*), YEARMONTHDAY(date) as d, data.schedule.source from molfar group BY data.schedule.source, d;
module.exports = [
    {
        method: "post",
        path: "/json/insert",
        handler: insertJson
    },
    {
        method: "post",
        path: "/json/update",
        handler: updateJson
    },
    {
        method: "post",
        path: "/json/delete",
        handler: deleteDoc
    },
    {
        method: "post",
        path: "/json/search",
        handler: searchJson
    },
    {
        method: "post",
        path: "/timeline",
        handler: timeline
    },
    {
        method: "post",
        path: "/content",
        handler: content
    },
    {
        method: "post",
        path: "/sql",
        handler: sqlRequest
    },
]