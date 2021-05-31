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
const prepareMessage = (api, msg = '') => {
  return new Promise((resolve, reject) => {
    let msgToSend = {
      body: msg ? '\n' + msg : '',
    };
    resolve(msgToSend);
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
  if (JSON.stringify(tasks) !== JSON.stringify(now)) {
    let newTasks = [];
    now.map((task) => {
      if (
        !tasks
          .map((task) => JSON.stringify(task))
          .includes(JSON.stringify(task))
      ) {
        newTasks.push(task);
      }
    });
    let message = formatTasks(
      now,
      newTasks.map((task) => task.id)
    );
    console.log(newTasks);
    const api = await initApi();
    const customMessage = newTasks.length
      ? '❗ ' + newTasks.length + ' tasks are created/changed.\n'
      : '🎉 ' + (tasks.length - now.length) + ' tasks are done!\n';
    let msg = await prepareMessage(api, customMessage + message);
    if (!isStart) {
      await sendMessage(api, msg);
    }
    tasks = now;
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
