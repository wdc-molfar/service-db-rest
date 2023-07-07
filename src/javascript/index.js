const bodyParser = require('body-parser')
const express    = require('express')
const CORS       = require("cors")
const swaggerUi  = require('swagger-ui-express');
const config     = require("./utils/yaml-config")("service.msapi.yaml")
const YAML       = require('yamljs');
const swStats    = require('swagger-stats');
const jwt        = require("jsonwebtoken");
const swaggerDocument = YAML.load('oas.yml');

const authMiddleware = (req, res, next) => {
    if(req.method === "OPTIONS"){
        next()
    }
    try{
        if(!req.headers.authorization){
            return res.status(401).json({message: "Not authorized"})
        }
        const token = req.headers.authorization.split(' ')[1]
        if(!token){
            return res.status(401).json({message: "Not authorized"})
        }
        const decoded = jwt.verify(token, config.service.secret_key)
        req.user = decoded
        next()
    }catch(e){
        if(e.message === "jwt expired"){
            return res.status(401).json({message: "Not authorized"})
        }else if(e.message === "invalid signature"){
            return res.status(401).json({message: "Not authorized"})
        }
        res.status(400).json({message: `Exception: ${e.message}`})
    }
}

const app = express();

app.use(CORS({
    origin: '*'
}))

app.use(bodyParser.text());

app.use(bodyParser.json({
    limit: '50mb'
}))

app.use(bodyParser.urlencoded({
    parameterLimit: 100000,
    limit: '50mb',
    extended: true
}));


swaggerDocument.servers[0].url = process.env.HOST || config.service.host;
swaggerDocument.servers[0].description = "";


app.use(swStats.getMiddleware({swaggerSpec:swaggerDocument, uriPath:"/metrics", name:"@molfar/service-db-rest"}))

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const routes  = require("./routes")
const auth    = require("./auth")
const router  = new express()

routes.forEach( route => {
    router[route.method](route.path, authMiddleware, route.handler) 
})

auth.forEach( route => {
    if(route.path === "/login"){
        app[route.method](route.path, route.handler) 
    }else{
        app[route.method](route.path, authMiddleware, route.handler) 
    }
})

app.use("/api",  router)

app.get("/", (_, res) => {
    res.writeHead(200, { 'Content-Type':'text/html'});
	res.end(JSON.stringify({service: "SERVICE-DB-REST"}))
})

module.exports = app