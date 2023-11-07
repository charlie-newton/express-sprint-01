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

  app.use(express.json());
  app.use(express.urlencoded({extended:true}));

// Controllers ------------------------------------

// Functions ---------------------
const getProjectsController = async (res, id) => {
    const sql = buildUsersProjectsSelectSql(id);
    const { isSuccess, result, message: accessorMessage } = await read(sql);
    if(!isSuccess) return res.status(400).json({ message: accessorMessage });

    res.status(200).json(result);
}

const postProjectsController = async (req, res) => {
    const sql = buildProjectsInsertSql(req.body);
    const { isSuccess, result, message: accessorMessage } = await createProjects(sql, req.body);
    if(!isSuccess) return res.status(404).json({ message: accessorMessage });

    res.status(201).json(result);

}

const postMembersController = async (req, res) => {
    const sql = buildMembersInsertSql(req.body);
    const { isSuccess, result, message: accessorMessage } = await createMembers(sql, req.body);
    if(!isSuccess) return res.status(404).json({ message: accessorMessage });

    res.status(201).json(result);
}

// Builders ----------------------
const buildSetFields = (fields) => fields.reduce((setSql, field, index) =>
    setSql + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), `SET ` );

const buildProjectsSelectSql = (id) => {
    let table = `projects`;
    let fields = ["projects.projectID, projects.projectName, projects.projectDescription"];
    let sql = `SELECT ${fields} FROM ${table} WHERE projects.projectID = ${id}`;

    return sql;
}

const buildUsersProjectsSelectSql = (id) => {
    let table = `(members INNER JOIN projects ON members.projectID = projects.projectID)`;
    let fields = ["projects.projectID, projects.projectName, projects.projectDescription"];
    let sql = `SELECT ${fields} FROM ${table} WHERE members.userID = ${id}`;

    return sql;
}

const buildMembersSelectSql = (id) => {
    let table = `members`;
    let fields = ["members.memberID, members.userID, members.projectID"];
    let sql = `SELECT ${fields} FROM ${table} WHERE members.memberID = ${id}`;

    return sql;
}

const buildProjectsInsertSql = (record) => {
    let table = `projects`;
    let mutableFields = ['projectName', 'projectDescription'];
    return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
}

const buildMembersInsertSql = (userID, projectID) => {
    let table = `members`;
    let mutableFields = ['userID', 'projectID'];
    return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
}

// CRUD --------------------------

const createProjects = async (sql, record) => {
    try {
        const status = await database.query(sql, record);

        const recoverRecordSql = buildProjectsSelectSql(status[0].insertId);

        const { isSuccess, result, message } = await read(recoverRecordSql);

        return isSuccess
            ? { isSuccess: true, result: result, message: "Record successfuly recovered" }
            : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

const createMembers = async (sql, record) => {
    try {
        const status = await database.query(sql, record);

        const recoverRecordSql = buildMembersSelectSql(status[0].insertId);

        const { isSuccess, result, message } = await read(recoverRecordSql);

        return isSuccess
            ? { isSuccess: true, result: result, message: "Record successfuly recovered" }
            : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

const read = async (sql) => {
    try {
        const [result] = await database.query(sql);
        return (result.length === 0)
            ? { isSuccess: false, result: null, message: "No record(s) found" }
            : { isSuccess: true, result: result, message: "Record(s) successfuly recovered" }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

// Endpoints --------------------------------------
app.get("/api/projects", (req, res) => getProjectsController(res, null));
app.get("/api/projects/users/:id", (req, res) => getProjectsController(res));

app.post("/api/projects", postProjectsController);

// Start server -----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));