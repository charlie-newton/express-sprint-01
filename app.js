// Imports ----------------------------------------
import express from "express";
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

// Controllers ------------------------------------
const projectsController = async (req, res) => {
    const id = req.params.id;
    const table = "members";
    const fields = ["projects.projectID, projects.projectName, projects.projectDescription"];
    const extendedFields = `${fields}`;
    const extendedTable = `${table} INNER JOIN projects ON members.projectID = projects.projectID`;
    const sql = `SELECT ${extendedFields} FROM ${extendedTable} WHERE members.userID = ${id}`;
    // Execute query
    let isSuccess = false;
    let message = "";
    let result = null;
    try {
        [result] = await database.query(sql);
        if(result.length === 0) {
            message = "No record(s) found";
        }
        else {
            isSuccess = true;
            message = "Record(s) successfuly recovered";
        }
    } catch (error) {
        message = `Failed to execute query: ${error.message}`;
    }
    // Responses
    isSuccess
        ? res.status(200).json(result)
        : res.status(400).json({message: message});
}

// Endpoints --------------------------------------
app.get("/api/projects/users/:id", projectsController);

// Start server -----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));