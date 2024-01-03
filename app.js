// Imports ----------------------------------------
import express from "express";
import projectsRouter from "./routers/projects-router.js"
import database from "./database.js";
import cors from "cors";

// Configure express app --------------------------
const app = new express();

// Configure middleware --------------------------
app.use(function (req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
  
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  
    next();
  
  });
  
  app.use(cors({ origin: '*' }));

  app.use(express.json());
  app.use(express.urlencoded({extended:true}));

// Endpoints --------------------------------------
app.use('/api/projects', projectsRouter)

// Start server -----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));