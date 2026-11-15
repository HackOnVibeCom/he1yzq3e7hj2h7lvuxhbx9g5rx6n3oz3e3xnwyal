export const legacyQuestions = [
  {
    "kind": "choice",
    "icon": "🍰",
    "title": [
      "最后一口",
      "The last bite"
    ],
    "prompt": [
      "你最爱吃的菜就剩一口了，朋友问：「这口我能吃吗？」",
      "A friend wants the last bite of your favorite food. What do you say?"
    ],
    "options": [
      [
        "吃吧，都给你。",
        "咱俩一人一半。",
        "抱歉，这口我要自己留着。"
      ],
      [
        "You can have the whole bite.",
        "Let’s split it.",
        "I’m saving it for myself."
      ]
    ]
  },
  {
    "kind": "choice",
    "icon": "👋",
    "title": [
      "认错人了",
      "Wrong person"
    ],
    "prompt": [
      "迎面走来个人，你手都挥一半了，突然发现认错人了。你怎么办？",
      "You’re halfway through a wave when you realize it’s the wrong person. What do you do?"
    ],
    "options": [
      [
        "默默把手放下。",
        "假装在伸懒腰。",
        "干脆将错就错，就当打个招呼。"
      ],
      [
        "Put my hand down.",
        "Pretend I’m stretching.",
        "Keep waving. Might as well say hi."
      ]
    ]
  },
  {
    "kind": "number",
    "icon": "📱",
    "title": [
      "几个标签页",
      "How many tabs?"
    ],
    "prompt": [
      "你手机浏览器里现在开着多少个标签页？凭直觉猜一下就行。",
      "How many tabs are open in your phone browser right now? A guess is fine."
    ]
  },
  {
    "kind": "assign",
    "icon": "✨",
    "title": [
      "只能留一个",
      "Keep one for life"
    ],
    "prompt": [
      "每件事分一个位置，每个位置只能用一次。",
      "Give each one a different fate."
    ],
    "options": [
      [
        "一辈子都能有",
        "再来最后一次",
        "以后再也没有"
      ],
      [
        "Keep it for life",
        "One last time",
        "Never again"
      ]
    ],
    "items": [
      [
        "睡到自然醒",
        "吃最爱吃的菜",
        "跟朋友笑到肚子疼"
      ],
      [
        "Waking up without an alarm",
        "Eating my favorite dish",
        "Laughing with friends until it hurts"
      ]
    ]
  },
  {
    "kind": "choice",
    "icon": "🍿",
    "title": [
      "剧透",
      "Spoilers"
    ],
    "prompt": [
      "看电影看到一半，朋友突然问你：「要我给你剧透结局吗？」",
      "You’re halfway through a movie. Your friend asks, “Want me to spoil the ending?”"
    ],
    "options": [
      [
        "别说，一个字都别说。",
        "先给点提示，我再想想。",
        "快说快说，我最爱被剧透了。"
      ],
      [
        "Don’t say a word.",
        "Give me a hint, then I’ll decide.",
        "Tell me everything. I love spoilers."
      ]
    ]
  },
  {
    "kind": "choice",
    "icon": "🌙",
    "title": [
      "多一个小时",
      "One extra hour"
    ],
    "prompt": [
      "每天白送你一个小时。你想早上多睡一小时，还是晚上多玩一小时？",
      "You get a free hour every day. Would you rather sleep in for an hour or have an extra hour to yourself at night?"
    ],
    "options": [
      [
        "早上多睡一小时。",
        "晚上多玩一小时。"
      ],
      [
        "Sleep in for an hour.",
        "Take the extra hour at night."
      ]
    ]
  },
  {
    "kind": "choice",
    "icon": "🎬",
    "title": [
      "这段剪掉",
      "Cut that scene"
    ],
    "prompt": [
      "有人跟拍你一天，只能剪掉一段。你剪哪段？",
      "A camera follows you around for a day. You can cut one scene. Which one?"
    ],
    "options": [
      [
        "一边找手机，一边拿着手机。",
        "打开冰箱看一眼，过两分钟又去看。",
        "戴着耳机唱歌，还以为自己唱得很小声。"
      ],
      [
        "Looking for my phone while holding it.",
        "Opening the fridge, then checking it again two minutes later.",
        "Singing with headphones on, thinking I’m being quiet."
      ]
    ]
  },
  {
    "kind": "text",
    "icon": "🔑",
    "title": [
      "老是找不着",
      "Always looking for"
    ],
    "prompt": [
      "有什么东西是你每次急用却死活找不到的？",
      "What’s one small thing you’re always looking for?"
    ],
    "hint": [
      "写一样就行。想不到可以跳过。",
      "Name one thing, or skip."
    ]
  }
];

export const questions = legacyQuestions.map((question, index) => {
  if (index === 3) return {
    ...question,
    title: ['超能力分给谁', 'Superpower swap'],
    prompt: [
      '假如给你三个超能力，自己留一个，送朋友一个，送你的死对头一个，你怎么分？',
      'You get three superpowers. Keep one, give one to a friend, and give one to your nemesis. Who gets what?'
    ],
    options: [
      ['留给自己', '送给朋友', '送给仇人'],
      ['For me', 'For a friend', 'For my nemesis']
    ],
    items: [
      ['粘枕头就秒睡', '永远能精准地抛梗接梗', '每次都能点到全桌最好吃的那道菜'],
      ['Fall asleep instantly', 'Always land the punchline', 'Always order the best dish']
    ],
    itemIcons: ['🌙', '💬', '🍴']
  };
  if (index === 6) return {
    ...question,
    icon: '🎧',
    title: ['哪件最像你', 'Sounds like me'],
    prompt: ['下面哪件事最像你会干的？', 'Which of these sounds most like you?'],
    options: [
      ['遇到喜欢的歌能单曲循环一整天。', '去餐厅吃饭总忍不住偷看隔壁桌点了啥。', '路上看到每一只小狗都要跟它打招呼。'],
      ['Play a song on repeat as soon as I like it.', 'Peek at other tables before I order.', 'Say hi to every cute dog I see.']
    ]
  };
  if (index === 7) return {
    ...question,
    prompt: [question.prompt[0], 'What’s one thing you can never find when you need it?']
  };
  return question;
});
