require('dotenv').config()
const express = require('express')
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const bodyParser = require('body-parser')
const cors = require('cors')
const httpStatus = require('http-status')
const mongoose = require('mongoose')
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const port = process.env.APP_PORT || 3000
const  {redisClient} = require('./src/config/redis')
const db = require('./src/config/database')
const userRoutes = require('./src/routes/users')
const productRoutes = require('./src/routes/products')
const app = express()

// Use Helmet!
app.use(helmet()); // set security HTTP headers
app.use(xss());
app.use(mongoSanitize());
app.use(compression());
app.use(cors());
app.options('*', cors());
app.use(bodyParser.json()); //json request body
app.use(express.urlencoded({ extended: true }))// parse urlencoded request body

//v1 routes
app.use('/api/v1/', userRoutes)
app.use('/api/v1/', productRoutes)

//connect to database
db.connect()
//connect to redis
redisClient.connect().catch(() => {
    console.log('Redis client not connected');
    process.exit(1)
    
})


app.listen(port, () => {
    console.log(`... listening on ${port}`)
 })


  
//swagger 
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: 'Sharelter API',
      version: '1.0.0',
      description: 'Sharelter API Documentation',
      license: {
        name: 'Zulfah',
        url: '',
      },
      contact: {
        name: '',
        url: '',
      },
      },
      servers: [
        {
          url: `http://localhost:${port}/api/v1`,
          description: 'Development server',
        }
      ],
    
}
    
const options = {
    swaggerDefinition,
    apis: [`./src/routes/*.js`],
}
const swaggerSpec = swaggerJSDoc(options)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
 
/*
 * root
*/
app.get('/', (req, res) => {
    res.status(200).json ({
        status: true,
        message: "Sharelter, share your space and make money. Proudly 🇳🇬"
    })
})


/// catch 404 and forwarding to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found, Seems you got lost. so sorry about that');
    err.status = 404;
    next(err);
})

/**
 * error handlers
 *
 * */ 
// development error handler
// will print stacktrace
if (process.env.NODE_ENV === 'development') {
    app.use((err, req, res, next) =>  {
        res.status(err.status || 500).json( {
            status: false,
            message: err.message,
            error: err
        });
    });
}


// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500).json({
        status: false,
        message: err.message,
    });
})




