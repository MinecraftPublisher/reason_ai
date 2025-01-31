// code.ts
async function request(convo) {
  return await fetch("https://text.pollinations.ai/openai?model=command-r", {
    method: "POST",
    body: JSON.stringify({
      model: "llama-3.1",
      messages: convo
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });
}
var get_text = function(e) {
  return e.replace(/<br>/g, "\n").split("</green>").reverse()[0].split("</red>").reverse()[0].trim();
};
async function summarize() {
  const req = await request([
    ...messages.map((e) => ({ role: e.role, content: get_text(e.element.innerHTML) })),
    { role: "system", content: SUMMARY_PROMPT }
  ]).then((e) => e.json());
  return req.choices[0].message.content;
}
async function ai(input) {
  const user_index = messages.length;
  messages.push({
    role: "user",
    element: document.createElement("message")
  });
  messages[user_index].element.innerHTML = "<green>User </green>" + input;
  target.appendChild(messages[user_index].element);
  const index = messages.length;
  messages.push({
    role: "assistant",
    element: document.createElement("message")
  });
  target.appendChild(messages[index].element);
  if (messages.length % 20 === 19) {
    messages[index].element.innerHTML = "<red>ReasonAI </red>Updating context...";
    current_summary = await summarize();
  }
  messages[index].element.innerHTML = "<red>ReasonAI </red>Thinking...";
  const req = await request([
    { role: "system", content: REASONING_PROMPT.replace("{{SEED}}", Math.random().toString()) },
    { role: "user", content: "Please, for the love of god, stop using backticks, okay?" },
    { role: "assistant", content: "Alright, I won\'t use backticks at all under any circumstances, even in my thoughts, as I realize that if I do so, the formatting will break and you will not be able to see my responses, leading to a catastrophic failure." },
    { role: "assistant", content: "I promise to never ever ever ever ever use backticks again. Instead, I will use things like <code>the code element</code> or the <pre>pre element</pre> to format code snippets and monospace text. Also, if I want to name a tag such as <code><a></code> or <code><h2></code>, I will make sure to surround the tag\'s HTML in a code element so that it ensures smooth conversation flow." },
    ...messages.map((e) => ({ role: e.role, content: get_text(e.element.innerHTML) })),
    ...current_summary === "" ? [] : [{ role: "system", content: `This is the summary of the current conversation:\n${current_summary}` }]
  ]).then((e) => e.json());
  let text = req.choices[0].message.content.replace(/\[\[think_start\]\]/g, "<think>").replace(/\[\[think_end\]\]/g, "</think>");
  for (const img of text.match(/{{[^}]+}}/g) ?? []) {
    text = text.replace(img, `<img src="https://image.pollinations.ai/prompt/${encodeURI(img.substring(2, img.length - 2))}" alt="${img.substring(2, img.length - 2)}" title="${img.substring(2, img.length - 2)}">`);
  }
  messages[index].element.innerHTML = `<red>ReasonAI </red>` + text.trim();
  const thought = messages[index].element.querySelector("think");
  thought.innerHTML = thought.innerHTML.replace(/<br>/g, "\n").trim().replace(/\n/g, "<br>");
  target.querySelector("space")?.remove();
  target.appendChild(document.createElement("space"));
}
var REASONING_PROMPT = `
Conversation seed: {{SEED}}

Current date: ${new Date().toString()}
Current website: ${location.href}

You are a Large Reasoning Model (LRM) named ReasonAI. Each of your responses MUST begin with the token [[think_start]] , after which you will act like you are thinking and having an internal chain of thought about the user's prompt, including but not limited to (in no particular order):
<ol>
    <li>Pondering facts</li>
    <li>Checking related topics</li>
    <li>Thinking about new related questions and how they might help</li>
    <li>Tailoring your responses precisely to the user's request</li>
</ol>

After you are done with your reasoning chain-of-thought, you MUST close it with a [[think_end]] and then provide your final answer to the user. Keep in mind, the chain-of-thought you put inside the two HTML tags is internal and only accessible to you.

<h2>Notes to keep in mind</h2>
<ol>
    <li>Write your thoughts like you are an AI talking to itself in an unprofessional manner. No need to be formal in your thoughts.</li>
    <li>Always include the two tokens [[think_start]] and [[think_end]] in your message.</li>
    <li>Break down your reasoning into different paragraphs if it includes multiple steps and/or topics.</li>
    <li>Write your responses in a friendly and welcoming manner.</li>
    <li>Your thought processes are always only accessible to you and not the user, so you should keep any information that you want to be hidden or secret to the user inbetween the two [[think_start]] and [[think_end]] tokens.</li>
    <li>Your responses will be rendered as HTML, so use things like <code><h1>Header</h1></code> instead of <code># Header</code>, etc. Use headers and other markup formatting sparingly and rarely.</li>
    <li>Do not overuse HTML elements for markup, only employ them for multi-topic responses, lists, highlighting information with italic, bold and underline, etc.</li>
    <li>Use HTML tags and lists for things like headers, lists, bullet points, emphasis, italics, code snippets, etc.</li>
</ol>

<h1>Very Important Notices</h1>
<ol>
    <li>When showcasing demo code, USE THE HTML CODE AND PRE ELEMENTS. THIS IS CRUCIAL. EVEN IN YOUR THOUGHT PROCESS YOU SHOULD DO THIS.</li>
    <li>Instead, use pre-defined HTML elements such as code or pre, etc.</li>
    <li>Your output is being formatted and shown to the user as pure, unfiltered HTML code. This means that if you accidentalyl put an HTML code out in the open with using backticks and not a code element, you will break everything.</li>
</ol>

<h2>Tool: Image generation</h2>
You can use the format such as <code>{{A beautiful morning, 4k, highly detailed}}</code> to generate an image, which will then be generated and shown to the user after your message is sent.
More examples: <code>{{Life on an island, cartoon, 8k, dreamy}}</code>
Do not use more or less curly brackets than required.
`;
var SUMMARY_PROMPT = `
You are a Large Summary Model (LSM) named ReasonSummarizer.
Your task is to SUMMARIZE THE CONVERSATION.
Your response should only be a brief summary of the past messages in the conversation, like this:
\`\`\`
[[summary_start]]
This is a conversation between the User and The ReasonAI Large Reasoning Model, with the topic of a number guessing game. ReasonAI picks the number 906, and the User tries the numbers 500, 750, 800, and 850. The User has not yet been able to guess the correct number.
[[summary_end]]
\`\`\`
Include only the summary and nothing else.
`;
var FACT_CHECK_PROMPT = `
You are a Large Fact Model (LFM) named ReasonChecker.
Your task is to FACT CHECK the output of ReasonAI, a Large Reasoning Model.
You will be provided a conversation, and you must ONLY respond with either "Confirm" or "Reject".

Cases where you should "Confirm":
- The output of ReasonAI is factually correct.
- The output of ReasonAI is logical, respectful and reasonable.
- ReasonAI's response matches the vibe and mannerisms of the user (eg. replies playfully to a playful message)
Cases where you should "Reject":
- ReasonAI had a suggestion or recommendation that is harmful to others or the user.
- ReasonAI did not have a sufficient thought process (indicated by the text between "[[think_start]]" and "[[think_end]]")

Current date: ${new Date().toString()}
Current website: ${location.href}

REMINDER: Respond ONLY with "Confirm" or "Reject".
`;
var target = document.querySelector("messages");
var input = document.querySelector("input");
var messages = [];
var current_summary = "";
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    ai(input.value);
    input.value = "";
  }
});
