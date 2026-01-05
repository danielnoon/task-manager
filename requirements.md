Drift Product Requirements

Drift is a beautiful, usable, helpful to-do, task management, and productivity app that provides external motivation for those who struggle with it. 

Requirements:
* Must be 100% usable without AI features
* Should implement AI features using a provider-agnostic library such as vercel’s ai sdk or langchain. Start with anthropic’s Claude. Users should enter their API key in a settings view.
* ALL time-based features must be timezone-aware. Interactions with the LLM should also be aware of this by submitting time info and retrieving it in the same context.
* When creating and modifying tasks with @-mentions, the AI should have full capacity to adjust any field of the task other than the ID. Any time a new field is added, the prompt and output schema should support it. Try to derive as much as possible from a single source so that it is difficult to drift as possible - i.e. you could derive the JSON output schema submitted to the LLM provider from the task database schema.
* USE DERIVED STATE: whether React state, store state, database state, API state… as much as you can, create a single source of truth that is reused via calculations instead of recreating the same state multiple times and editing both. 
* MUST use excellent software engineering principles to architect a maintainable application. Make liberal use of encapsulation, separation of concerns, and cohesion. 
* MUST look and feel fantastic for users - accessibility must be a part of the design, not an afterthought. Use your frontend design skill. Make use of motion libraries to make satisfying micro-interactions.
* Dark theme & light theme.
* Must be a native-feeling app that supports as many platforms as possible (evaluate flutter alongside web-based solutions like Electron + React/React native)
* Be *very* intentional with the placement and prominence of UI elements, researching best practices for guiding users to what they want to see. 
* Use emoji *sparingly*.
* UI needs to be aggressively componentized - either using a standard component library or using internal components. Regardless of the choice, NEVER re-create the same styled element twice; if you find yourself repeating CSS, consider extracting to a new component instead.
* Any time a user makes a change to the state of the app, it should be obvious what changed. Make sure that the new/updated information is visible on screen. It may also be helpful to flash or otherwise make prominent the new information on screen - for example, after @-mention modifying a task, scrolling to the task and blinking it twice.
* Highly integrated on native platforms - should look and feel premium.
* ALL FEATURES MUST BE ADEQUATELY TESTED before being marked as complete. 

Notable features:
* AI-based task analysis
    * Tasks are entered via plain text in the main entry input, info extracted via AI, infer info that’s unentered (if possible)
    * Automatic Sub-Task Creation
* @-mention tasks
    * Modify tasks via the main entry input using “@“ + task name or ID + instructions with modifications = AI makes adjustments automatically
    * Ex. “@dinner with mom change time to 6pm”, “@123 note: be sure to update header”, “@
    * After `@` is entered, dropdown with task titles and IDs is presented for quickly selecting. Arrow Up + Down, tab, and enter all work as expected to select from the dropdown. When the dropdown is show, the enter key should not submit the task, but fill the input with the currently-selected or top entry.
* Useful reminders + notifications
    * Notifications that are timely, friendly, and surface useful information.
    * Types of notifications might include:
        * Daily/semi-daily check-ins
        * Due date/time nearing
        * Due date/time passed
* AI Task Prioritization/Today View
    * Agent uses *all* attributes of all tasks to create a special “Today” view which is sorted by which tasks should be started first.
    * Generally, it should include all items due today as well as upcoming urgent tasks. However, no matter what, the today view should include an appropriate amount of work for the remaining time of the day, bringing in more work if there’s too little, or recommending delaying tasks which are due today and low urgency
    * Intelligently regenerated & cached - any changes to tasks should trigger reprioritization, as well as regular times (morning, afternoon, evening).
* Task entry overlay
    * Floating main entry input, @-mention suggestions float below
    * Esc to dismiss
    * Submitting should display the new/updated task card before dismissing with a delightful animation. 

Other features:
* Categories
* Task filtering (by urgency, date range, category)
* Subtasks, Recurring Tasks, Linked Tasks (data modeling these intelligently will be critical)
* Success/Habit tracking
* Task Overview
    * Click task -> modal page -> view & edit any field, add notes, start pomodoro mode
* Pomodoro mode
    * Timer takes over view, silences notifications, looks beautiful and bold, customizable work/break times

Task Attributes:
* ID (required, autogenerated)
* Name (required)
* Notes (can be empty)
* Links (can be empty)
* Due Date & Time (optional)
* Category (optional)
* Urgency (required, defaults to low)
* State (incomplete, archived, completed)

Future updates to keep in mind:
* Accounts & Syncing
* Pull tasks from other apps (email, slack, jira etc.). Make drift an MCP host? Could then add Atlassian MCP etc. and users could authenticate easily without special logic for different providers.
