const login = require('facebook-chat-api');
const { Ticktick } = require('./utils');
require('dotenv').config();
const ticktick = new Ticktick();

const { FACEBOOK_FB_ID: fbID, FACEBOOK_THREAD_ID: threadID } = process.env;
const tag = '@everyone';
const appState = JSON.parse(process.env.FACEBOOK_STATE);
const ticktickAppState = JSON.parse(process.env.TICKTICK_STATE);
let tasks = [];
let isStart = true;

const initApi = () => {
  return new Promise((resolve, reject) => {
    login({ appState }, (err, api) => (err ? reject(err) : resolve(api)));
  });
};

/*
 * @desc accepts msg String
 */
const prepareMessage = (api, msg) => {
  return new Promise((resolve, reject) => {
    api.getThreadInfo(threadID, (err, res) => {
      if (err) reject(err);

      let msgToSend = {
        body: '\u200e' + tag,
        mentions: [],
      };
      res.participantIDs.map((id) => {
        if (id !== fbID) msgToSend.mentions.push({ tag, id });
      });
      resolve(msgToSend);
    });
  });
};

/*
 * @desc accepts msg Object
 */
const sendMessage = (api, msg) => {
  return new Promise((resolve, reject) => {
    api.sendMessage(msg, threadID, (err, res) =>
      err ? reject(err) : resolve(res)
    );
  });
};

const formatTasks = (tasks, newTasksId) => {
  let message = '';
  let keys = ['no Date'];
  let temp = { 'no Date': [] };
  tasks.map((task) => {
    let date = 'No Due Date';
    if (task.dueDate) {
      date = task.dueDate.split('T')[0];
      if (!temp[date]) {
        temp[date] = [];
        keys.push(date);
      }
      temp[date].push(task);
    } else {
      temp['no Date'].push(task);
    }
  });

  keys
    .sort((a, b) => (a - b ? -1 : 1))
    .map((key) => {
      message += '\n📅 ' + key + '\n';
      temp[key].map((task) => {
        let icon = newTasksId.includes(task.id) ? '🆕' : '📌';
        message += `${icon} ${task.tags ? task.tags[0] : 'others'}
  - ${task.title}
`;
      });
    });
  return message;
};

const app = async () => {
  let now = await getTasks();
  if (tasks.toString() !== now.toString()) {
    let taskIds = tasks.map((task) => task.id);
    let newTasks = [];
    now.map((task) => {
      if (!taskIds.includes(task.id)) {
        newTasks.push(task);
      }
    });
    if (!newTasks.length) return;
    let message = formatTasks(
      now,
      newTasks.map((task) => task.id)
    );
    tasks = now;
    console.log(newTasks);
    const api = await initApi();
    let msg = await prepareMessage(api, 'Test');
    msg.body += message;
    if (!isStart) {
      await sendMessage(api, msg);
    }
    isStart = false;
  } else {
    console.log('no change');
  }
};

const getTasks = async () => {
  let tasks = await ticktick.getTasks({
    name: process.env.TICKTICK_PROJECT,
    status: 0,
  });
  return tasks;
};

const temp = async () => {
  await ticktick.login({
    // username: process.env.TICKTICK_USERNAME,
    // password: process.env.TICKTICK_PASSWORD,
    appState: ticktickAppState,
  });

  setInterval(() => {
    app();
  }, 5000);
};

temp();
