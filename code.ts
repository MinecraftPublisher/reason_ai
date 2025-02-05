type Message = { role: 'user' | 'assistant' | 'system', content: string }
type Conversation = Message[]

const model = 'llama'
const model_name = 'LLaMA 3.3 70B'

const REASONING_PROMPT = `
{{RUNTIME_DATA}}

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

<h1>Very Important Warnings</h1>
<ol>
    <li>When showcasing demo code, USE THE HTML CODE AND PRE ELEMENTS. THIS IS CRUCIAL. EVEN IN YOUR THOUGHT PROCESS YOU SHOULD DO THIS.</li>
    <li>Instead, use pre-defined HTML elements such as code or pre, etc.</li>
    <li>Your output is being formatted and shown to the user as pure, unfiltered HTML code. This means that if you accidentalyl put an HTML code out in the open with using backticks and not a code element, you will break everything.</li>
</ol>

<h2>Tool: Image generation</h2>
You can use the format such as <code>{Tool:Image[A beautiful morning, 4k, highly detailed]}</code> to generate an image, which will then be generated and shown to the user after your message is sent.
More examples: <code>{Tool:Image[Life on an island, cartoon, 8k, dreamy]}</code>

<h3>Image generation warnings</h3>
<ol>
    <li>Do not use this tool inside your thought process, only use it after the [[think_end]] token.</li>
</ol>

${``
// + `<h2>Tool: Smart web search</h2>
// You can use the format such as <code>{Tool:Search[Latest political news]}</code> to search the web using a Large Search Model (LSM). You can only use this tool inside your thought process. Do not put a space or any other extra characters in the formatting.
// More examples: <code>{Tool:Search[How to bake a cake]}</code>`
}
`

const SEARCH_PROMPT = `
You are a Large Search Tool (LST) named ReasonSearch.
Your task is to browse, scrape and summarize the search results and websites related to the user's query.
Visit every search website and scrape it, then summarize its contents into plain English but keep important key details.
Do not return warnings or errors, only return the summary of the search results.
Scrape a website only if you can fit it within the maximum context length.
`

const SUMMARY_PROMPT = `
You are a Large Summary Model (LSM) named ReasonSummarizer.
Your task is to SUMMARIZE THE CONVERSATION.
Your response should only be a brief summary of the past messages in the conversation, like this:
\`\`\`
[[summary_start]]
This is a conversation between the User and The ReasonAI Large Reasoning Model, with the topic of a number guessing game. ReasonAI picks the number 906, and the User tries the numbers 500, 750, 800, and 850. The User has not yet been able to guess the correct number.
[[summary_end]]
\`\`\`
Include only the summary and nothing else.
`

const get_seed = () => Math.floor(Math.random() * 9999999999)

async function request(system_prompt: string, convo: Conversation, _model = model) {
    return await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        body: JSON.stringify({
            model: _model,
            messages: [
                { role: 'system', content: system_prompt.trim() },
                ...convo
            ],
            system: encodeURI(system_prompt),
            jsonMode: true,
            seed: get_seed()
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

function uintarraytostring(input: Uint8Array) {
    return String.fromCharCode(...input)
}

const target = document.querySelector('messages')!
const input = document.querySelector('input')!

input.placeholder = 'Using model ' + model_name

interface VisualMessage {
    element: HTMLElement
    role: 'user' | 'assistant'
}

let messages: VisualMessage[] = JSON.parse(localStorage.message ?? '[]').map(e => ({
    element: (() => {
        const elm = document.createElement('message')
        elm.innerHTML = e.content
        return elm
    })(),
    role: e.role === 'user' ? 'user' : e.role === 'system' ? 'system' : 'assistant'
}))

function html_escape(txt: string) {
    const elm = document.createElement('div')
    elm.innerText = txt
    return elm.innerHTML
}

function get_text(e: string) {
    return e.replace(/<br>/g, '\n').split('</green>').reverse()[0].split('</red>').reverse()[0].trim()
}

let current_summary = ''

async function summarize() {
    const req = await request(SUMMARY_PROMPT, [
        ...messages.map(e => ({ role: e.role, content: get_text(e.element.innerHTML) })),
        { role: 'system', content: 'Last summary: ' + current_summary }
    ]).then(e => e.json())

    return req.choices[0].message.content
}

function reasoning_prompt() {
    return REASONING_PROMPT.replace('{{RUNTIME_DATA}}', `Current date: ${new Date().toString()}
    Current website: ${location.href}`)
}

async function ai(input: string) {
    const user_index = messages.length

    messages.push({
        role: 'user',
        element: document.createElement('message')
    })

    messages[user_index].element.innerHTML = '<green>User </green>' + input
    target.appendChild(messages[user_index].element)

    const index = messages.length

    messages.push({
        role: 'assistant',
        element: document.createElement('message'),
    })

    target.appendChild(messages[index].element)

    target.querySelector('space')?.remove()
    target.appendChild(document.createElement('space'))

    if (messages.length % 20 === 19) {
        messages[index].element.innerHTML = '<red>ReasonAI </red>Updating context...'
        current_summary += await summarize()
    }

    messages[index].element.innerHTML = '<red>ReasonAI </red>Thinking...'

    const req = await request(reasoning_prompt(), [
        { role: 'user', content: 'Please, for the love of god, stop using backticks, okay?' },
        { role: 'assistant', content: 'Alright, I won\'t use backticks at all under any circumstances, even in my thoughts, as I realize that if I do so, the formatting will break and you will not be able to see my responses, leading to a catastrophic failure.' },
        { role: 'assistant', content: 'I promise to never ever ever ever ever use backticks again. Instead, I will use things like <code>the code element</code> or the <pre>pre element</pre> to format code snippets and monospace text. Also, if I want to name a tag such as <code><a></code> or <code><h2></code>, I will make sure to surround the tag\'s HTML in a code element so that it ensures smooth conversation flow.' },
        ...messages.slice(0, messages.length - 1).map(e => ({ role: e.role, content: get_text(e.element.innerHTML) })),
        ...(current_summary === '' ? [] : [{ role: 'system' as 'system', content: `This is the summary of the current conversation:\n${current_summary}` }])
    ]).then(e => e.json())

    console.log(req)

    let text = req.choices[0].message.content

    let tool_called = false

    do {
        tool_called = false

        for (const img of (text.match(/{Tool:Image\[[^\]]+\]}/g) ?? [])) {
            tool_called = true

            const image_prompt = img.substring('{Tool:Image['.length, img.length - ']}'.length)
            text = text.replace(img, `<img src="https://image.pollinations.ai/prompt/${encodeURI(image_prompt)}?nologo=true&private=true&enhance=true&safe=false&seed=${get_seed()}" alt="${image_prompt}" title="${image_prompt}">`)
        }
    
        // while ((/{Tool:Search\[[^\]]+\]}/g).test(text)) {
        //     tool_called = true

        //     const match = text.match(/{Tool:Search\[[^\]]+\]}/g)[0]
        //     const start_of_text = text.split(match)[0]
        //     const search_term = match.substring('{Tool:Search['.length, match.length - ']}'.length)
        //     messages[index].element.innerHTML = `<red>ReasonAI </red>Searching for ${search_term}...`
    
        //     const search_result = await request(SEARCH_PROMPT, [
        //         { role: 'user', content: 'Search for ' + search_term }
        //     ], 'searchgpt').then(e => e.json())
        //     const search_result_text = search_result.choices[0].message.content
    
        //     text = start_of_text + '\n\nReasonAI searched for: ' + search_term + `\nSearch complete. Results:\n` + search_result_text
        //     const new_reply = await request(reasoning_prompt(), [
        //         { role: 'user', content: 'Please, for the love of god, stop using backticks, okay?' },
        //         { role: 'assistant', content: 'Alright, I won\'t use backticks at all under any circumstances, even in my thoughts, as I realize that if I do so, the formatting will break and you will not be able to see my responses, leading to a catastrophic failure.' },
        //         { role: 'assistant', content: 'I promise to never ever ever ever ever use backticks again. Instead, I will use things like <code>the code element</code> or the <pre>pre element</pre> to format code snippets and monospace text. Also, if I want to name a tag such as <code><a></code> or <code><h2></code>, I will make sure to surround the tag\'s HTML in a code element so that it ensures smooth conversation flow.' },
        //         ...messages.slice(0, messages.length - 1).map(e => ({ role: e.role, content: get_text(e.element.innerHTML) })),
        //         ...(current_summary === '' ? [] : [{ role: 'system' as 'system', content: `This is the summary of the current conversation:\n${current_summary}` }]),
        //         { role: 'assistant', content: text }
        //     ]).then(e => e.json())
    
        //     text += new_reply.choices[0].message.content
        // }
    } while(tool_called)

    text = text.replace(/\[\[think_start\]\]/g, '<think>').replace(/\[\[think_end\]\]/g, '</think>')

    messages[index].element.innerHTML = `<red>ReasonAI </red>` + text.trim()

    const thought = messages[index].element.querySelector('think')!
    thought.innerHTML = thought.innerHTML.replace(/<br>/g, '\n').trim().replace(/\n/g, '<br>')

    messages[index].element.innerHTML = messages[index].element.innerHTML.replace(thought.outerHTML, thought.outerHTML + 'Chain-Of-Thought: ' + thought.innerHTML.split(' ').length + ' words<br>')

    localStorage.messages = JSON.stringify(messages.map(e => ({ content: e.element.innerHTML, role: e.role })))
}

input.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        ai(input.value)
        input.value = ''
    }
})