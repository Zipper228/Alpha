import dotenv from "dotenv";
dotenv.config();
import { Bot, session, Keyboard } from "grammy";
import { checkAccountBalance, checkTransactionByUSD, make_transaction, } from "./coin.js";
import { conversations, createConversation, } from "@grammyjs/conversations";
import { createTableUsers, createTableLogs, getUser, getLogs, createLog, deleteUser, createUser, updateUsers, updateBalance, checkUser, createTableTrans, createTrans, getTrans, getUserByName, usableBalance, deleteTrans, deleteEverything, parseFloat, createTableAdmins, checkAdmin, createAdmin, getAdmin, } from "./db.js";
await createTableUsers();
await createTableLogs();
await createTableTrans();
await createTableAdmins();
function initial() {
    return {};
}
var botToken = process.env.BOT_TOKEN || "";
var botTokenAdmin = process.env.BOT_TOKEN_LOGS || "";
const bot = new Bot(botToken);
const botAdmin = new Bot(botTokenAdmin);
bot.use(session({ initial }));
bot.use(conversations());
await bot.api.setMyCommands([
    {
        command: "start",
        description: "Старт",
    },
]);
const errorInProgram = new Error("Ошибка в программе");
async function whatdoyouwant(ctx) {
    try {
        if (ctx.from === undefined) {
            await ctx.reply("Ошибка. Попробуйте еще раз.");
            await whatdoyouwant(ctx);
            return;
        }
        if (await checkUser(String(ctx.from.id))) {
            await ctx.reply("Что вы хотите сделать?", {
                reply_markup: inlineKeyboardNew,
            });
        }
        else {
            const user = await getUser(String(String(ctx.from.id)));
            if (user.paid_user || user.allowed_cash_out) {
                await ctx.reply("Что вы хотите сделать?", {
                    reply_markup: inlineKeyboard,
                });
            }
            else {
                await ctx.reply("Что вы хотите сделать?", {
                    reply_markup: inlineKeyboardNoCash,
                });
            }
        }
        console.log("done");
        return;
    }
    catch (error) {
        console.log("error in whatdoyouwant" + error);
        return;
    }
}
const yesNo = new Keyboard().text("Да").row().text("Нет");
async function changeMyAddress(conversation, ctx) {
    var _a;
    try {
        console.log("starting changeMyAddress");
        await ctx.reply("Введите свой адрес:");
        const message = await conversation.wait();
        if (message.message !== undefined) {
            try {
                if (message.message.text === undefined) {
                    await whatdoyouwant(ctx);
                    return;
                }
                const balance = await checkAccountBalance(message.message.text);
                if (balance !== undefined) {
                    await ctx.reply("Баланс на этом аккаунте такой: " +
                        parseFloat(Number(balance), 2) +
                        "?", {
                        reply_markup: yesNo,
                    });
                    if (ctx.from === undefined) {
                        await whatdoyouwant(ctx);
                        return;
                    }
                    const replyYesNo = await conversation.wait();
                    console.log(replyYesNo);
                    if (replyYesNo.message === undefined ||
                        replyYesNo.message.text !== "Да") {
                        await ctx.reply("Ошибка. Попробуйте еще раз.");
                        await whatdoyouwant(ctx);
                        return;
                    }
                    if (await checkUser(String(ctx.from.id))) {
                        if (replyYesNo.message.text === undefined) {
                            await ctx.reply("Ошибка. Попробуйте еще раз.");
                            await whatdoyouwant(ctx);
                            return;
                        }
                        createUser(String(ctx.from.id), message.message.text, (_a = ctx.from) === null || _a === void 0 ? void 0 : _a.username);
                        await ctx.reply("Адрес сохранен.");
                    }
                    else {
                        await updateUsers(String(ctx.from.id), "address", message.message.text);
                        await ctx.reply("Адрес сохранен.");
                    }
                    await whatdoyouwant(ctx);
                    return;
                }
                else {
                    await ctx.reply("Такого аккаунта не существует.");
                    await whatdoyouwant(ctx);
                    return;
                }
            }
            catch (error) {
                await ctx.reply("Такого аккаунта не существует.");
                await whatdoyouwant(ctx);
                return;
            }
        }
    }
    catch (error) {
        console.log(error);
    }
}
bot.use(createConversation(changeMyAddress));
/*bot.command("Поменять адрес", async (ctx) => {
  await ctx.reply("Введите свой адрес:");
  await ctx.conversation.enter("changeMyAddress");
});*/
async function CheckByUSD(conversation, ctx) {
    try {
        await ctx.reply("Введите сумму в рублях:");
        if (ctx.from === undefined) {
            await ctx.reply("Ошибка. Попробуйте еще раз.");
            await whatdoyouwant(ctx);
            return;
        }
        if (await checkUser(String(ctx.from.id))) {
            await ctx.reply("Вы не указали свой адрес.");
            await whatdoyouwant(ctx);
            return;
        }
        const message = await conversation.wait();
        if (message.message !== undefined) {
            var reply;
            if (ctx.from === undefined) {
                await ctx.reply("Ошибка. Попробуйте еще раз.");
                await whatdoyouwant(ctx);
                return;
            }
            let user = await getUser(String(ctx.from.id));
            await createLog(String(ctx.from.id), Number(message.message.text));
            try {
                reply = await checkTransactionByUSD(Number(message.message.text), false);
            }
            catch (error) {
                if (error instanceof Error) {
                    await ctx.reply("Ошибка в программе.");
                }
                else {
                    await ctx.reply("Ошибка в программе.");
                }
            }
            if (reply === undefined) {
                await ctx.reply("Ошибка в программе.");
                await whatdoyouwant(ctx);
                return;
            }
            for (let i = 0; i < reply.length; i++) {
                let hashes = await getTrans(reply[i].hash);
                if (hashes === undefined || (hashes === null || hashes === void 0 ? void 0 : hashes.length) > 0) {
                    reply.splice(i, 1);
                    i--;
                }
            }
            if (reply.length === 0) {
                await ctx.reply("Такой транзакции не существует.");
                await whatdoyouwant(ctx);
                let admins = await getAdmin(undefined);
                for (let i = 0; i < admins.length; i++) {
                    botAdmin.api.sendMessage(admins[i].user_id, "Пользователь: @" +
                        user.username +
                        ", сумма: " +
                        Number(message.message.text) +
                        " рублей, транзакция: не существует");
                }
                return;
            }
            await ctx.reply("Такая транзакция существует");
            let admins = await getAdmin(undefined);
            for (let i = 0; i < admins.length; i++) {
                botAdmin.api.sendMessage(admins[i].user_id, "Пользователь: @" +
                    user.username +
                    ", сумма: " +
                    Number(message.message.text) +
                    " рублей, транзакция: " +
                    reply[0].hash);
            }
            if (ctx.from === undefined) {
                await ctx.reply("Ошибка. Попробуйте еще раз.");
                await whatdoyouwant(ctx);
                return;
            }
            let newBalance = reply[0].value * user.share || 0;
            await updateBalance(String(ctx.from.id), parseFloat(newBalance, 2), true);
            await createTrans(reply[0].hash);
            await whatdoyouwant(ctx);
        }
    }
    catch (error) {
        console.log(error);
    }
}
bot.use(createConversation(CheckByUSD));
/*bot.command("Проверь РУБ", async (ctx) => {
  await ctx.reply("Введите сумму");
  await ctx.conversation.enter("CheckByUSD");
});*/
async function CheckByLitecoin(conversation, ctx) {
    try {
        await ctx.reply("Введите сумму в Litecoin:");
        if (ctx.from === undefined) {
            await ctx.reply("Ошибка. Попробуйте еще раз.");
            await whatdoyouwant(ctx);
            return;
        }
        if (await checkUser(String(ctx.from.id))) {
            await ctx.reply("Вы не указали свой адрес.");
            await whatdoyouwant(ctx);
            return;
        }
        const { message } = await conversation.wait();
        if (message !== undefined) {
            var reply;
            if (ctx.from === undefined) {
                await ctx.reply("Ошибка. Попробуйте еще раз.");
                await whatdoyouwant(ctx);
                return;
            }
            let user = await getUser(String(ctx.from.id));
            await createLog(String(ctx.from.id), Number(message.text));
            try {
                reply = await checkTransactionByUSD(Number(message.text), true);
            }
            catch (error) {
                if (error instanceof Error) {
                    await ctx.reply("Ошибка в программе.");
                }
                else {
                    await ctx.reply("Ошибка в программе.");
                }
            }
            if (reply === undefined) {
                await ctx.reply("Ошибка в программе.");
                await whatdoyouwant(ctx);
                return;
            }
            console.log(reply.length);
            for (let i = 0; i < reply.length; i++) {
                let hashes = await getTrans(reply[i].hash);
                console.log(reply[i].hash);
                console.log(hashes);
                if (hashes === undefined || (hashes === null || hashes === void 0 ? void 0 : hashes.length) > 0) {
                    reply.splice(i, 1);
                    i--;
                }
            }
            /*if (reply.length > 1) {
            await ctx.reply(
              "Несколько транзакций подходят такому описанию. Попробуйте указать сумму точнее."
            );
            return;
          } else */
            if (reply.length === 0) {
                await ctx.reply("Такой транзакции не существует.");
                await whatdoyouwant(ctx);
                let admins = await getAdmin(undefined);
                for (let i = 0; i < admins.length; i++) {
                    botAdmin.api.sendMessage(admins[i].user_id, "Пользователь: @" +
                        user.username +
                        ", сумма: " +
                        Number(message.text) +
                        " Litecoin, транзакция: не существует");
                }
                return;
            }
            await ctx.reply("Такая транзакция существует");
            let admins = await getAdmin(undefined);
            for (let i = 0; i < admins.length; i++) {
                botAdmin.api.sendMessage(admins[i].user_id, "Пользователь: @" +
                    user.username +
                    ", сумма: " +
                    Number(message.text) +
                    " Litecoin, транзакция: " +
                    reply[0].hash);
            }
            if (ctx.from === undefined) {
                await ctx.reply("Ошибка. Попробуйте еще раз.");
                await whatdoyouwant(ctx);
                return;
            }
            let newBalance = reply[0].value * user.share || 0;
            await updateBalance(String(ctx.from.id), parseFloat(newBalance, 2), true);
            await createTrans(reply[0].hash);
            await whatdoyouwant(ctx);
        }
    }
    catch (error) {
        console.log(error);
    }
}
bot.use(createConversation(CheckByLitecoin));
/*bot.command("Проверить по Litecoin", async (ctx) => {
  await ctx.reply("Введите сумму:");
  await ctx.conversation.enter("CheckByLitecoin");
});*/
async function makeTrans(conversation, ctx) {
    try {
        if (ctx.from === undefined) {
            await ctx.reply("Ошибка. Попробуйте еще раз.");
            return;
        }
        const user = await getUser(String(ctx.from.id));
        if (user.length === 0) {
            await ctx.reply("Вы не указали свой адрес");
        }
        try {
            await ctx.reply("Транзакция в процессе.");
            await make_transaction(user.balance, user.address);
            await ctx.reply("Транзакция удалась.");
            await updateBalance(String(ctx.from.id), user.balance, false);
            await whatdoyouwant(ctx);
        }
        catch (error) {
            await ctx.reply("Транзакция не удалась");
            await whatdoyouwant(ctx);
        }
    }
    catch (error) {
        console.log(error);
    }
}
bot.use(createConversation(makeTrans));
const admin = new Keyboard()
    .text("Посмотреть логи пользователя.")
    .row()
    .text("Удалить пользователя.")
    .row()
    .text("Поменять долю пользователя.")
    .row()
    .text("Поменять баланс пользователя.")
    .row()
    .text("Перевести деньги с аккаунта")
    .row()
    .text("Поменять принадлежность транзакции")
    .row()
    .text("Показать данные пользователя")
    .row()
    .text("Добавить/Убрать платного пользователя")
    .row()
    .text("Разрешить выплату")
    .row()
    .text("Выйти из режима админа")
    .row()
    .text("Полный ребут (не нажимать)");
async function help(conversation, ctx) {
    try {
        if (ctx.from === undefined) {
            await ctx.reply("Ошибка. Попробуйте еще раз.");
            return;
        }
        let hasAccount = await checkAdmin(String(ctx.from.id));
        if (hasAccount === false) {
            await ctx.reply("Введите ключ админа:");
            var message = await conversation.wait();
            if (message.message === undefined ||
                message.message.text !== process.env.KEY) {
                await ctx.reply("Неверный ключ.");
                return;
            }
            await createAdmin(String(ctx.from.id), ctx.from.username);
        }
        var reply;
        while (true) {
            await ctx.reply("Выберите действие", {
                reply_markup: admin,
            });
            reply = await conversation.wait();
            if (reply.message === undefined) {
                await ctx.reply("Ошибка. Попробуйте еще раз.");
                return;
            }
            switch (reply.message.text) {
                case "Посмотреть логи пользователя.":
                    await ctx.reply("Введите имя или ID пользователя:");
                    var teleg_name = await conversation.wait();
                    if (teleg_name.message === undefined) {
                        await ctx.reply("Ошибка. Попробуйте еще раз.");
                        break;
                    }
                    try {
                        let id = await getUserByName(teleg_name.message.text || "");
                        id = Number(id.teleg_id);
                        var logs;
                        if (id === undefined) {
                            logs = await getLogs(teleg_name.message.text || "");
                            if (logs === undefined) {
                                await ctx.reply("Пользователя с таким именем нет. Возможно, у пользователя не было username. Попробуйте найти ID пользователя в этом боте: https://t.me/getUserID_Robot");
                                break;
                            }
                        }
                        else {
                            logs = await getLogs(id);
                        }
                        console.log(logs);
                        if (logs === undefined) {
                            await ctx.reply("Пользователя с таким именем нет.");
                            break;
                        }
                        for (let i = 0; i < logs[0].length; i++) {
                            await ctx.reply("Время: " + logs[0][i].datetime + ", Cумма: " + logs[0][i].value);
                        }
                    }
                    catch (error) {
                        await ctx.reply("Пользователя с таким именем нет. Возможно, у пользователя не было username. Попробуйте найти ID пользователя в этом боте: https://t.me/getUserID_Robot");
                        break;
                    }
                    reply = undefined;
                    break;
                case "Удалить пользователя.":
                    await ctx.reply("Введите имя или ID пользователя:");
                    var teleg_name = await conversation.wait();
                    if (teleg_name.message === undefined) {
                        throw "Ошибка. Попробуйте еще раз.";
                    }
                    try {
                        let id = await getUserByName(teleg_name.message.text || "");
                        id = Number(id.teleg_id);
                        if (id === undefined) {
                            console.log(teleg_name.message.text);
                            await deleteUser(teleg_name.message.text || "");
                        }
                        else {
                            await deleteUser(id);
                            await ctx.reply("Пользователь удален.");
                            break;
                        }
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.message === undefined) {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            await ctx.reply(error.message);
                            break;
                        }
                    }
                    break;
                case "Поменять долю пользователя.":
                    try {
                        console.log("lox");
                        await ctx.reply("Введите имя или ID пользователя:");
                        var teleg_name = await conversation.wait();
                        if (teleg_name.message === undefined) {
                            throw new Error("Ошибка с чтением имени пользователя.");
                        }
                        let id = await getUserByName(teleg_name.message.text || "");
                        id = Number(id.teleg_id);
                        if (id === undefined) {
                            throw new Error("Ошибка с чтением имени пользователя.");
                        }
                        else {
                            await ctx.reply("Введите новую долю пользователя.");
                            let newValue = await conversation.wait();
                            if (newValue.message === undefined) {
                                throw new Error("Ошибка с чтением доли пользователя.");
                            }
                            await updateUsers(id, "share", newValue.message.text);
                            await ctx.reply("Доля поменена.");
                            break;
                        }
                    }
                    catch (error) {
                        await ctx.reply(String(error));
                    }
                    break;
                case "Поменять баланс пользователя.":
                    try {
                        await ctx.reply("Введите имя или ID пользователя:");
                        var teleg_name = await conversation.wait();
                        if (teleg_name.message === undefined) {
                            throw "Ошибка с чтением имени пользователя.";
                        }
                        let id = await getUserByName(teleg_name.message.text || "");
                        id = Number(id.teleg_id);
                        if (id === undefined) {
                            throw "Ошибка с чтением имени пользователя.";
                        }
                        else {
                            await ctx.reply("Введите новый баланс пользователя.");
                            let newValue = await conversation.wait();
                            if (newValue.message === undefined) {
                                throw "Ошибка с чтением баланса пользователя.";
                            }
                            await updateUsers(id, "balance", newValue.message.text);
                            await ctx.reply("Баланс поменен.");
                            break;
                        }
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.message === "Ошибка с чтением имени пользователя." ||
                                error.message === "Ошибка с чтением доли пользователя.") {
                                await ctx.reply(error.message);
                            }
                            else {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            break;
                        }
                    }
                    break;
                case "Добавить/Убрать платного пользователя":
                    try {
                        await ctx.reply("Введите имя или ID пользователя:");
                        var teleg_name = await conversation.wait();
                        if (teleg_name.message === undefined) {
                            throw "Ошибка с чтением имени пользователя.";
                        }
                        let id = await getUserByName(teleg_name.message.text || "");
                        id = Number(id.teleg_id);
                        if (id === undefined) {
                            throw "Ошибка с чтением имени пользователя.";
                        }
                        else {
                            await ctx.reply("Добавить или убрать?", {
                                reply_markup: addOrDelete,
                            });
                            let trueOrFalse = await conversation.wait();
                            if (trueOrFalse.message === undefined) {
                                throw "Ошибка с чтением.";
                            }
                            var newValue;
                            if (trueOrFalse.message.text === "Добавить") {
                                newValue = true;
                            }
                            else if (trueOrFalse.message.text === "Убрать") {
                                newValue = false;
                            }
                            else {
                                throw "Ошибка";
                            }
                            await updateUsers(id, "paid_user", newValue);
                            await ctx.reply("Платный пользователь добавлен.");
                            break;
                        }
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.message === "Ошибка с чтением имени пользователя.") {
                                await ctx.reply(error.message);
                            }
                            else {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            break;
                        }
                    }
                    break;
                case "Разрешить выплату":
                    try {
                        await ctx.reply("Добавить/Убрать возможность выплаты всем?", {
                            reply_markup: yesNo,
                        });
                        var everyoneOrNot = await conversation.wait();
                        if (everyoneOrNot.message === undefined) {
                            throw "Ошибка с чтением.";
                        }
                        if (everyoneOrNot.message.text === "Да") {
                            await ctx.reply("Добавить или убрать?", {
                                reply_markup: addOrDelete,
                            });
                            let trueOrFalse = await conversation.wait();
                            if (trueOrFalse.message === undefined) {
                                throw "Ошибка с чтением.";
                            }
                            var newValue;
                            if (trueOrFalse.message.text === "Добавить") {
                                newValue = true;
                            }
                            else if (trueOrFalse.message.text === "Убрать") {
                                newValue = false;
                            }
                            else {
                                throw "Ошибка";
                            }
                            await updateUsers(undefined, "allowed_cash_out", newValue);
                            break;
                        }
                        else if (everyoneOrNot.message.text === "Нет") {
                            await ctx.reply("Введите имя или ID пользователя:");
                            var teleg_name = await conversation.wait();
                            if (teleg_name.message === undefined) {
                                throw "Ошибка с чтением имени пользователя.";
                            }
                            let id = await getUserByName(teleg_name.message.text || "");
                            id = Number(id.teleg_id);
                            if (id === undefined) {
                                throw "Ошибка с чтением имени пользователя.";
                            }
                            else {
                                await ctx.reply("Добавить или убрать?", {
                                    reply_markup: addOrDelete,
                                });
                                let trueOrFalse = await conversation.wait();
                                if (trueOrFalse.message === undefined) {
                                    throw "Ошибка с чтением.";
                                }
                                var newValue;
                                if (trueOrFalse.message.text === "Добавить") {
                                    newValue = true;
                                }
                                else if (trueOrFalse.message.text === "Убрать") {
                                    newValue = false;
                                }
                                else {
                                    throw "Ошибка";
                                }
                                await updateUsers(id, "paid_user", newValue);
                                await ctx.reply("Платный пользователь добавлен.");
                                break;
                            }
                        }
                        else {
                            throw "Ошибка";
                        }
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.message === "Ошибка с чтением имени пользователя.") {
                                await ctx.reply(error.message);
                            }
                            else {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            break;
                        }
                    }
                    break;
                case "Полный ребут (не нажимать)":
                    await ctx.reply("Введите ключ админа:");
                    var message = await conversation.wait();
                    if (message.message === undefined ||
                        message.message.text !== process.env.KEY) {
                        await ctx.reply("Неверный ключ.");
                        return;
                    }
                    try {
                        await deleteEverything();
                        await ctx.reply("Все таблицы созданы заново.");
                        break;
                    }
                    catch (error) {
                        await ctx.reply("Ошибка. Попробуйте еще раз.");
                        break;
                    }
                case "Поменять принадлежность транзакции":
                    try {
                        await ctx.reply("Введите hash транзакции:");
                        let hash = await conversation.wait();
                        if (hash.message === undefined) {
                            throw "Ошибка с чтением hash.";
                        }
                        await deleteTrans(hash.message.text || "");
                        await ctx.reply("Транзакция удалена.");
                        break;
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.name === "Ошибка с чтением hash.") {
                                await ctx.reply(error.name);
                            }
                            else {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            break;
                        }
                        break;
                    }
                case "Показать данные пользователя":
                    try {
                        await ctx.reply("Введите имя или ID пользователя:");
                        var teleg_name = await conversation.wait();
                        if (teleg_name.message === undefined) {
                            throw "Ошибка с чтением имени пользователя.";
                        }
                        let id = await getUserByName(teleg_name.message.text || "");
                        id = Number(id.teleg_id);
                        if (id === undefined) {
                            throw "Ошибка с чтением имени пользователя.";
                        }
                        else {
                            let user = await getUser(id);
                            if (user === undefined) {
                                throw "Ошибка с чтением имени пользователя.";
                            }
                            await ctx.reply("Username: " + user.username);
                            await ctx.reply("Адрес: " + user.address);
                            await ctx.reply("Баланс: " + user.balance);
                            await ctx.reply("Доля: " + user.share);
                            await ctx.reply("Платный пользователь: " + user.paid_user);
                            await ctx.reply("Доступен вывод денег: " + user.allowed_cash_out);
                            break;
                        }
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.name === "Ошибка с чтением имени пользователя." ||
                                error.name === "Ошибка с чтением доли пользователя.") {
                                await ctx.reply(error.name);
                            }
                            else {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            break;
                        }
                    }
                    break;
                case "Перевести деньги с аккаунта":
                    try {
                        const account = process.env.MY_ADDRESS || "";
                        let balance = await checkAccountBalance(account);
                        let balanceUsable = await usableBalance(Number(balance));
                        if (balance === undefined) {
                            throw "Ошибка с определеннием баланса.";
                        }
                        if (balanceUsable === undefined) {
                            throw "Ошибка с определеннием баланса.";
                        }
                        await ctx.reply("Баланс вашего аккаунта: " + balance);
                        await ctx.reply("Баланс, который не принадлежит одному из пользователей: " +
                            balanceUsable);
                        await ctx.reply("Сколько вы хотите вывести?");
                        let value = await conversation.wait();
                        if (value.message === undefined) {
                            throw "Ошибка с чтением суммы.";
                        }
                        console.log(Number(value.message.text));
                        await ctx.reply("На какой аккаунт?");
                        let recepient = await conversation.wait();
                        if (recepient.message === undefined) {
                            throw "Ошибка с чтением адреса.";
                        }
                        if (recepient.message.text === undefined) {
                            throw "Ошибка с чтением адреса.";
                        }
                        let transaction = await make_transaction(Number(value.message.text), recepient.message.text);
                        await ctx.reply("Транзакция удалась: " + transaction);
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            if (error.name === "Ошибка с определеннием баланса." ||
                                error.name === "Ошибка с чтением суммы.") {
                                await ctx.reply(error.name);
                            }
                            else {
                                await ctx.reply("Ошибка. Попробуйте еще раз.");
                            }
                            break;
                        }
                    }
                    break;
                case "Выйти из режима админа":
                    await ctx.reply("Вы вышли из режима админа.");
                    await whatdoyouwant(ctx);
                    return;
            }
        }
    }
    catch (error) {
        console.log(error);
    }
}
bot.use(createConversation(help));
const inlineKeyboardNew = new Keyboard()
    .text("Добавить Litecoin адрес")
    .row()
    .text("Помощь")
    .oneTime();
const addOrDelete = new Keyboard()
    .text("Добавить")
    .row()
    .text("Убрать")
    .oneTime();
const inlineKeyboard = new Keyboard()
    .text("Показать мой Litecoin адрес и баланс")
    .row()
    .text("Поменять Litecoin адрес")
    .row()
    .text("Проверить транзакцию по сумме в рублях")
    .row()
    .text("Проверить транзакцию по сумме в Litecoin")
    .row()
    .text("Вывести деньги на свой аккаунт")
    .row()
    .text("Помощь")
    .oneTime();
const inlineKeyboardNoCash = new Keyboard()
    .text("Показать мой Litecoin адрес и баланс")
    .row()
    .text("Поменять Litecoin адрес")
    .row()
    .text("Проверить транзакцию по сумме в рублях")
    .row()
    .text("Проверить транзакцию по сумме в Litecoin")
    .row()
    .text("Помощь")
    .oneTime();
bot.command("start", async (ctx) => {
    await whatdoyouwant(ctx);
});
bot.on("message:text", async (ctx) => {
    try {
        switch (ctx.msg.text) {
            case "Показать мой Litecoin адрес и баланс":
                if (ctx.from === undefined) {
                    await ctx.reply("Ошибка. Попробуйте еще раз.");
                    await whatdoyouwant(ctx);
                    return;
                }
                await ctx.reply(ctx.from.username || "");
                const user = await getUser(String(ctx.from.id));
                console.log(String(ctx.from.id));
                if (user === undefined) {
                    await ctx.reply("Ошибка. Попробуйте еще раз.");
                    await whatdoyouwant(ctx);
                    return;
                }
                await ctx.reply("Аккаунт: " + user.address);
                await ctx.reply("Баланс: " + parseFloat(user.balance, 2));
                await whatdoyouwant(ctx);
                break;
            case "Поменять Litecoin адрес":
                await ctx.conversation.enter("changeMyAddress");
                break;
            case "Проверить транзакцию по сумме в рублях":
                await ctx.conversation.enter("CheckByUSD");
                break;
            case "Проверить транзакцию по сумме в Litecoin":
                await ctx.conversation.enter("CheckByLitecoin");
                break;
            case "Вывести деньги на свой аккаунт":
                await ctx.conversation.enter("makeTrans");
                break;
            case "Добавить Litecoin адрес":
                await ctx.conversation.enter("changeMyAddress");
                break;
            case "Помощь":
                await ctx.conversation.enter("help");
                break;
        }
    }
    catch (error) {
        console.log(error);
    }
});
bot.start();
