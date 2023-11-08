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
const getProjectsController = async (req, res) => {
    const sql = buildUsersProjectsSelectSql(req.params.id);
    const { isSuccess, result, message: accessorMessage } = await readProjects(sql);
    if(!isSuccess) return res.status(400).json({ message: accessorMessage });

    res.status(200).json(result);
}

const postProjectsController = async (req, res) => {
    const sql = buildProjectsInsertSql(req.body);
    const { isSuccess, result, message: accessorMessage, id } = await createProjects(sql, req.body);
    if(!isSuccess) return res.status(404).json({ message: accessorMessage });

    const member = {
        "userID": req.params.id,
        "projectID": id
    }
    const memberSql = buildMembersInsertSql(member);
    const { memberIsSuccess, memberResult, memberMessage: memberAccessorMessage } = await createMembers(memberSql, member);
    if(!memberIsSuccess) return res.status(404).json({ memberMessage: memberAccessorMessage });

    res.status(201).json(result);
}

const postMembersController = async (req, res, userID, projectID) => {
    const data = {
        "userID": userID,
        "projectID": projectID
    }
    const sql = buildMembersInsertSql(userID, projectID);
    const { isSuccess, result, message: accessorMessage } = await createMembers(sql, data);
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
    let table = `members INNER JOIN projects ON members.projectID = projects.projectID`;
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

const buildMembersInsertSql = (record) => {
    let table = `members`;
    let mutableFields = ['userID', 'projectID'];
    return `INSERT INTO ${table} ` + buildSetFields(mutableFields);
}

// CRUD --------------------------

const createProjects = async (sql, record) => {
    try {
        const status = await database.query(sql, record);

        const recoverRecordSql = buildProjectsSelectSql(status[0].insertId);

        const { isSuccess, result, message, id } = await readProjects(recoverRecordSql);

        return isSuccess
            ? { isSuccess: true, result: result, message: "Record successfuly recovered", id: status[0].insertId }
            : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}`, id: null }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}`, id: null }
    }
}

const createMembers = async (sql, record) => {
    try {
        const status = await database.query(sql, record);

        const recoverRecordSql = buildMembersSelectSql(status[0].insertId);
        
        const { memberIsSuccess, memberResult, memberMessage } = await readMembers(recoverRecordSql);

        return memberIsSuccess
            ? { memberIsSuccess: true, memberResult: memberResult, memberMessage: "Record successfuly recovered" }
            : { memberIsSuccess: false, memberResult: null, memberMessage: `Failed to recover the inserted record: ${memberMessage}` }
    } 
    catch (error) {
        return { memberIsSuccess: false, memberResult: null, memberMessage: `Failed to execute query: ${error.message}` }
    }
}

const readProjects = async (sql) => {
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

const readMembers = async (sql) => {
    try {
        const [memberResult] = await database.query(sql);
        return (memberResult.length === 0)
            ? { memberIsSuccess: false, memberResult: null, memberMessage: "No record(s) found" }
            : { memberIsSuccess: true, memberResult: memberResult, memberMessage: "Record(s) successfuly recovered" }
    } 
    catch (error) {
        return { memberIsSuccess: false, memberResult: null, memberMessage: `Failed to execute query: ${error.message}` }
    }
}

// Endpoints --------------------------------------
app.get("/api/projects", (req, res) => getProjectsController(res, null));
app.get("/api/projects/users/:id", getProjectsController);

app.post("/api/projects/users/:id", postProjectsController);

// Start server -----------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));