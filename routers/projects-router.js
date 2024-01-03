import { Router } from "express";
import database  from "../database.js";

const router = Router();

// Query builders --------------------------------------------------------
const buildSetFields = (fields) => fields.reduce((setSql, field, index) =>
    setSql + `${field}=:${field}` + ((index === fields.length - 1) ? '' : ', '), `SET ` );

// Create --------
const buildProjectsCreateQuery = (record) => {
    let table = `projects`;
    let mutableFields = ['projectName', 'projectDescription', 'projectImage', 'projectDeadline'];
    const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
    return { sql, data: record }
}
const buildMembersCreateQuery = (record) => {
    let table = `members`;
    let mutableFields = ['userID', 'projectID'];
    const sql = `INSERT INTO ${table} ` + buildSetFields(mutableFields);
    return { sql, data: record }
}

// Read ----------
const buildProjectsReadQuery = (id) => {
    let table = `projects`;
    let fields = ["projectID, projectName, projectDescription, projectImage, projectDeadline"];
    let sql = `SELECT ${fields} FROM ${table} WHERE projectID = :ID`;

    return {sql, data: { ID: id }};
}
const buildUsersProjectsReadQuery = (id) => {
    let table = `members INNER JOIN projects ON members.projectID = projects.projectID`;
    let fields = ["projects.projectID, projects.projectName, projects.projectDescription, projects.projectImage, projects.projectDeadline"];
    let sql = `SELECT ${fields} FROM ${table} WHERE members.userID = :ID`;

    return {sql, data: { ID: id }};
}
const buildMembersReadQuery = (id) => {
    let table = `members`;
    let fields = ["memberID, userID, projectID"];
    let sql = `SELECT ${fields} FROM ${table} WHERE memberID = :ID`;

    return {sql, data: { ID: id }};
}

// Update --------
const buildProjectsUpdateQuery = (record, id) => {
    let table = `projects`;
    let mutableFields = ['projectName', 'projectDescription', 'projectImage', 'projectDeadline'];
    const sql = `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE projectID=:projectID`;
    return { sql, data: { ...record, projectID: id} }
}

// Delete --------
const buildProjectsDeleteQuery = (id) => {
    let table = `projects`;
    const sql = `DELETE FROM ${table} WHERE projectID=:projectID`;
    return { sql, data: { projectID: id} }
}
const buildMembersProjectsDeleteQuery = (id) => {
    let table = `members`;
    const sql = `DELETE FROM ${table} WHERE members.projectID=:projectID`;
    return { sql, data: { projectID: id} }
}

// Data accessors --------------------------------------------------------
const createEntry = async (createQuery, readQuery) => {
    try {
        const status = await database.query(createQuery.sql, createQuery.data);

        const recoverRecordQuery = readQuery(status[0].insertId);

        const { isSuccess, result, message, id } = await readEntry(recoverRecordQuery);

        return isSuccess
            ? { isSuccess: true, result: result, message: "Record successfuly recovered" }
            : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}` }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

const readEntry = async (readQuery) => {
    try {
        const [result] = await database.query(readQuery.sql, readQuery.data);
        return (result.length === 0)
            ? { isSuccess: false, result: null, message: "No record(s) found" }
            : { isSuccess: true, result: result, message: "Record(s) successfuly recovered" }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

const updateEntry = async (updateQuery) => {
    try {
        const status = await database.query(updateQuery.sql, updateQuery.data );

        if (status[0].affectedRows === 0)
            return { isSuccess: false, result: null, message: `Failed to update record: no rows affected` }

        const readQuery = buildProjectsReadQuery(updateQuery.data.projectID);

        const { isSuccess, result, message } = await readEntry(readQuery);

        return isSuccess
            ? { isSuccess: true, result: result, message: "Record successfuly recovered" }
            : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

const deleteEntry = async (deleteQuery) => {
    try {
        const status = await database.query(deleteQuery.sql, deleteQuery.data);

        return status[0].affectedRows === 0
            ? { isSuccess: false, result: null, message: `Failed to delete record ${id}` }
            : { isSuccess: true, result: null, message: "Record sucessfully deleted" }
    } 
    catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` }
    }
}

// Controllers -----------------------------------------------------------
const getProjectsController = async (req, res) => {
    const id = req.params.id;
    
    const query = buildUsersProjectsReadQuery(id);
    const { isSuccess: projectSuccess, result: projectResult, message: projectAccessorMessage } = await readEntry(query);
    if(!projectSuccess) return res.status(400).json({ message: projectAccessorMessage });

    res.status(200).json(projectResult);
}

const postProjectsController = async (req, res) => {
    const projectQuery = buildProjectsCreateQuery(req.body);
    const { isSuccess: projectSuccess, result: projectResult, message: projectAccessorMessage } = await createEntry(projectQuery, buildProjectsReadQuery);
    if(!projectSuccess) return res.status(404).json({ message: projectAccessorMessage });

    const member = {
        "userID": req.params.id,
        "projectID": projectResult[0].projectID
    }
    const memberQuery = buildMembersCreateQuery(member);
    const { isSuccess: memberSuccess, result: memberResult, message: memberAccessorMessage } = await createEntry(memberQuery, buildMembersReadQuery);
    if(!memberSuccess) return res.status(404).json({ message: memberAccessorMessage });

    res.status(201).json(projectResult);
}

const putProjectsController = async (req, res) => {
    const id = req.params.id;
    const record = req.body;

    const query = buildProjectsUpdateQuery(record, id);
    const { isSuccess, result, message: accessorMessage } = await updateEntry(query);
    if(!isSuccess) return res.status(400).json({ message: accessorMessage });

    res.status(200).json(result);
}

const deleteProjectsController = async (req, res) => {
    const id = req.params.id;
    const record = req.body;

    const membersQuery = buildMembersProjectsDeleteQuery(id);
    const { isSuccess: memberSuccess, result: memberResult, message: memberAccessorMessage } = await deleteEntry(membersQuery);
    if(!memberSuccess) return res.status(400).json({ message: memberAccessorMessage });

    const projectQuery = buildProjectsDeleteQuery(id);
    const { isSuccess, result, message: accessorMessage } = await deleteEntry(projectQuery);
    if(!isSuccess) return res.status(400).json({ message: accessorMessage });

    res.status(200).json({ message: accessorMessage });
}

// Endpoints -------------------------------------------------------------
router.get("/users/:id", (req, res) => getProjectsController(req, res));
router.put("/:id", (req, res) => putProjectsController(req, res));
router.post("/users/:id", postProjectsController);
router.delete("/:id", deleteProjectsController);

export default router;