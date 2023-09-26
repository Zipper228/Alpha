import mysql from "mysql2";
import dotenv from "dotenv";
import express, { query } from "express";
import { webhookCallback } from "grammy";
import { bot } from "./bot.js";
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

export function datetime() {
  let date = new Date();
  const dateSQL =
    date.toISOString().split("T")[0] + " " + date.toTimeString().split(" ")[0];
  return dateSQL;
}

export async function createTableUsers() {
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS " +
        process.env.MYSQL_TABLE_NAME_USERS +
        " (address VARCHAR(50) NOT NULL, teleg_id INT NOT NULL, username VARCHAR(40), share FLOAT NOT NULL, balance FLOAT NOT NULL, PRIMARY KEY (teleg_id))"
    );
  } catch (error) {
    console.log("ERROR IN CREATETABLEUSERS " + error);
  }
}

export async function createTableLogs() {
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS " +
        process.env.MYSQL_TABLE_NAME_LOGS +
        " (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, datetime VARCHAR(25) NOT NULL, value FLOAT NOT NULL, FOREIGN KEY (user_id) REFERENCES " +
        process.env.MYSQL_TABLE_NAME_USERS +
        "(teleg_id))"
    );
  } catch (error) {
    console.log("ERROR IN CREATETABLELOGS " + error);
  }
}

export async function createTableTrans() {
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS " +
        process.env.MYSQL_TABLE_NAME_TRANS +
        " (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, hash VARCHAR(70) NOT NULL)"
    );
  } catch (error) {
    console.log("ERROR IN CREATETABLETRANS " + error);
  }
}

export async function getUser(id: number) {
  try {
    const [result] = await pool.query(
      "SELECT * FROM " +
        process.env.MYSQL_TABLE_NAME_USERS +
        " WHERE teleg_id = ?",
      [id]
    );
    return JSON.parse(JSON.stringify(result))[0];
  } catch (error) {
    console.log("ERROR IN GETuser " + error);
  }
}

export async function getUserByName(username: string) {
  try {
    const [result] = await pool.query(
      "SELECT teleg_id FROM " +
        process.env.MYSQL_TABLE_NAME_USERS +
        " WHERE username = ?",
      [username]
    );
    return JSON.parse(JSON.stringify(result))[0];
  } catch (error) {
    console.log("ERROR IN GETuser " + error);
  }
}

export async function getLogs(user_id: number) {
  try {
    const [result] = await pool.query(
      "SELECT * FROM " +
        process.env.MYSQL_TABLE_NAME_LOGS +
        " WHERE user_id = ?",
      [user_id]
    );

    return [JSON.parse(JSON.stringify(result))];
  } catch (error) {
    console.log("ERROR IN GETLOGS " + error);
  }
}

export async function getTrans(hash: string) {
  try {
    const result = await pool.query(
      "SELECT * FROM " + process.env.MYSQL_TABLE_NAME_TRANS + " WHERE hash = ?",
      [hash]
    );
    let resultOne = JSON.parse(JSON.stringify(result));
    return resultOne[0];
  } catch (error) {
    console.log("ERROR IN GETTRANS " + error);
  }
}

export async function usableBalance(balance: number) {
  try {
    var [balances] = await pool.query(
      "SELECT balance FROM " + process.env.MYSQL_TABLE_NAME_USERS
    );
    var result = JSON.parse(JSON.stringify(balances));
    for (let i = 0; i < result.length; i++) {
      balance -= result[i].balance;
      console.log(result[i].balance);
    }
    return balance;
  } catch (error) {
    throw error;
  }
}

export async function createLog(user_id: number, value: number) {
  const dateTime = datetime();
  try {
    const result = await pool.query(
      "INSERT INTO " +
        process.env.MYSQL_TABLE_NAME_LOGS +
        "(user_id, datetime, value) VALUES (?, ?, ?)",
      [user_id, dateTime, value]
    );

    var [bydate] = await pool.query(
      "SELECT id FROM " +
        process.env.MYSQL_TABLE_NAME_LOGS +
        " WHERE user_id = ? ORDER BY id DESC LIMIT 10 OFFSET " +
        process.env.MYSQL_LOGS_SAVE_NUM,
      [user_id]
    );

    const bydateRes = JSON.parse(JSON.stringify(bydate));

    if (bydateRes.length === 0) {
      return [JSON.parse(JSON.stringify(result)), bydateRes];
    }

    var stringRequest =
      "DELETE FROM " + process.env.MYSQL_TABLE_NAME_LOGS + " WHERE";
    for (let i = 0; i < bydateRes.length; i++) {
      if (i !== 0) {
        stringRequest += " OR";
      }
      stringRequest += " id = " + String(bydateRes[i].id);
    }

    await pool.query(stringRequest);

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.log("ERROR IN CREATELOG " + error);
  }
}

export async function createTrans(hash: string) {
  try {
    const result = await pool.query(
      "INSERT INTO " + process.env.MYSQL_TABLE_NAME_TRANS + "(hash) VALUES (?)",
      [hash]
    );

    var [bydate] = await pool.query(
      "SELECT id FROM " +
        process.env.MYSQL_TABLE_NAME_TRANS +
        " WHERE hash = ? ORDER BY id DESC LIMIT 10 OFFSET " +
        process.env.MYSQL_TRANS_SAVE_NUM,
      [hash]
    );

    const bydateRes = JSON.parse(JSON.stringify(bydate));

    if (bydateRes.length === 0) {
      return [JSON.parse(JSON.stringify(result)), bydateRes];
    }

    var stringRequest =
      "DELETE FROM " + process.env.MYSQL_TABLE_NAME_TRANS + " WHERE";
    for (let i = 0; i < bydateRes.length; i++) {
      if (i !== 0) {
        stringRequest += " OR";
      }
      stringRequest += " id = " + String(bydateRes[i].id);
    }

    await pool.query(stringRequest);

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.log("ERROR IN CREATETRANS " + error);
  }
}

export async function deleteUser(teleg_id: number) {
  try {
    await pool.query(
      "DELETE FROM " + process.env.MYSQL_TABLE_NAME_LOGS + " WHERE user_id = ?",
      [teleg_id]
    );

    await pool.query(
      "DELETE FROM " +
        process.env.MYSQL_TABLE_NAME_USERS +
        " WHERE teleg_id = ?",
      [teleg_id]
    );
  } catch (error) {
    console.log("ERROR IN DELETEUSER " + error);
  }
}

export async function createUser(
  teleg_id: number,
  address: string,
  username?: string,
  share?: number
) {
  try {
    const shareUpdated = share || 0.15;
    const result = await pool.query(
      "INSERT INTO " +
        process.env.MYSQL_TABLE_NAME_USERS +
        " (teleg_id, address, username, share, balance) VALUES (?, ?, ?, ?, ?)",
      [teleg_id, address, username, shareUpdated, 0]
    );

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.log("ERROR IN CREATEUSERS " + error);
  }
}

export async function updateUsers(
  teleg_id: number,
  toUpdate: string,
  newValue: any
) {
  console.log(newValue);
  console.log(
    "UPDATE " +
      process.env.MYSQL_TABLE_NAME_USERS +
      " SET " +
      toUpdate +
      " = " +
      newValue +
      " WHERE teleg_id = " +
      teleg_id
  );

  try {
    await pool.query(
      "UPDATE " +
        process.env.MYSQL_TABLE_NAME_USERS +
        " SET " +
        toUpdate +
        " = " +
        newValue +
        " WHERE teleg_id = " +
        teleg_id
    );
  } catch (error) {
    console.log("ERROR IN UPDATEUSERS " + error);
  }
}

export async function updateBalance(
  teleg_id: number,
  value: number,
  increase: boolean
) {
  const user = await getUser(teleg_id);
  var balance = user.balance;
  console.log(balance);
  if (increase) {
    balance += value;
  } else {
    balance -= value;
  }

  await updateUsers(teleg_id, "balance", balance);
}

export async function dropTable(table: string) {
  console.log("DROP TABLE " + table);
  await pool.query("DROP TABLE " + table);
}

export async function checkUser(teleg_id: number) {
  const user = await getUser(teleg_id);
  if (user !== undefined) {
    return false;
  } else {
    return true;
  }
}

//await dropTable(process.env.MYSQL_TABLE_NAME_LOGS || "");
await dropTable(process.env.MYSQL_TABLE_NAME_TRANS || "");
await createTableTrans();
//deleteUser(875460557);
//console.log(await usableBalance(100));
