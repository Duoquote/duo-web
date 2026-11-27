---
title: "How I run subagents: one lead developer, briefed a step at a time"
date: 2026-11-27
description: "My orchestrator and subagent pattern in Claude Code: the main session plans and reviews, a few Haiku scouts read the code, and one Opus lead developer per workstream gets briefed one step at a time. How I got there from 10-agent swarms, and how it compares with Anthropic, Cognition and Google."
summary:
  - "The main Claude Code session is the orchestrator. It plans, writes briefs, reviews and relays decisions. One Opus lead developer per workstream does the writing and is kept alive and briefed one step at a time."
  - "It started as 10-agent research swarms in February 2026 and turned serial between 19 and 28 September, the same week Opus 5.5 arrived. From 22 October to 27 November the main sessions launched 536 agents and sent 2,224 messages to agents that already existed."
  - "It agrees with Cognition's single-writer rule (April 2026) and lines up with Anthropic's fold-subagents post (22 October) and Google's /teamwork findings (13 November). The difference: subagents do the work and the main loop stays nearly empty."
  - "Caveats: the rules aren't strict in practice, worktrees went from banned to required, and part of what makes it work is the model."
tags: [ai, claude-code, agents, subagents]
draft: true
---

Most of my Claude Code sessions run the same way now. The main session is the orchestrator: it plans, writes the briefs, reviews what comes back and talks to me. One Opus agent at xhigh effort writes the code. I keep that agent alive for the whole workstream and brief it one step at a time, like a lead developer. Before it starts, up to three Haiku agents read the codebase and report back, because reading is cheap and readers can't conflict with each other.

I didn't start like this. I went through this year's Claude Code history on both of my machines to see when each part showed up, so the dates below come from my logs. I'm CTO and a managing partner at NextGeography, and this covers company work and side projects.

## From swarms to one lead

In February my first big request was "USE MULTIPLE AGENTS TO DO THE RESEARCH (PREFERABLY 10+ AGENTS)". In March and April the median swarm I asked for was 10 agents, sometimes 20 or 30, and almost all of it was research. Even then I'd run a quick scout pass first and fan out with what it found, the same two-stage shape I use now.

From May I asked for fewer and stronger agents, Opus and Fable instead of Sonnet. On 31 May I first told a session "you are an orchestrator to manage opus sub agents", and by early September I was telling it "do not work yourself".

The big change came between 19 and 28 September, when I went from "do at most run 2 sub agents in parallel" to "one sub agent should be live at a time". Parallel writers in one tree kept getting in each other's way, and I think one report at a time also kept the orchestrator's context small. Opus 5.5 also arrived that week, and I said at the time that it was really good at instructing subagents. I can't fully separate my method from the model.

By the end of October it had a name. The Opus agent was the lead developer: give it a task, wait for it to finish, then brief it the next step. Between 22 October and 27 November my main sessions launched 536 agents and sent 2,224 messages to agents that already existed. One agent got 219 messages in a single session.

## How I brief and steer

I don't write most briefs myself. I give the orchestrator the goal, the constraints and the shape of the team, and it writes the brief. The median one is about 4,700 characters. It opens with a role ("You are the lead developer for one feature in this repo. I am the orchestrator."), then a "Read first" list with `ARCHITECTURE.md` and `AGENTS.md`, then hard limits: read-only for scouts, no builds on the machine where a Rust build freezes the desktop, never print secrets, no commits before review.

The team shape usually fits in my first message. For my phone's ROM project, in October (lightly edited):

> Orient yourself around the codebase using haiku xhigh agents, 3 at most. After orientation we'll make changes using 1 single opus xhigh sub agent, as an orchestrator ourselves.

During a run I send short messages, often while the agent is still working. I don't want a batch of fixes dumped on the lead at once. On a launcher app in November I sent a handful in one message, said they all go to the Opus agent and not the orchestrator, and asked it to brief that same agent as each task finishes. A few days earlier I'd put the same rule in a harness system prompt: brief each step when something lands, instead of dumping all tasks at once.

The orchestrator relays my decisions, and it quotes me when the exact wording is important: "PRIORITY change from the user. Pause 1.6 at a clean commit point, do this first, then continue 1.6." The quoting is there because of a mistake: once the orchestrator wrote a rule into a brief that I never said, the lead built on it, and a later step had to start with "that rule was the orchestrator's, never the user's".

I also keep the gates. In August it was "when results land do wait for my command", and commits waited for a clean review. On 7 November I told one session to wait for my word before spawning scouts, then 48 minutes later told it not to wait between waves.

Coordination gets plain rules as problems show up. On 26 and 27 November I had up to six leads alive, one per workstream, among them [polytini](/polytini), its demo site and this blog. Two benchmark agents built gates that scanned for each other's processes and deadlocked, so the orchestrator replaced them with one shared lock, a directory created atomically. It also set the release order (0.1.8 before 0.1.9). After one agent's `pkill` took out another agent's runner, the rule became: stop only processes you started, by PID.

## Where this sits next to the published advice

[Anthropic's multi-agent research post](https://www.anthropic.com/engineering/multi-agent-research-system) (13 June 2025) is where the "up to 90%" research-time number comes from. It's about parallel subagents doing breadth-first research, like my February swarms. It also says coding, with its shared context, isn't a good fit, and that's the wall I hit.

[Cognition](https://cognition.com/blog/multi-agents-working) (22 April 2026) said multi-agent works when "writes stay single-threaded". That's my single lead, and they wrote it five months before I got there. I came to it from my own projects, but I won't claim it first.

Anthropic's [When to fold subagents into your main agent loop](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) (22 October 2026) argues for fewer subagents and more skills and tools loaded as needed in one loop. I agree with fewer, but I fold the other way. The lead holds the context and the main loop keeps almost nothing, because the orchestrator is the session I talk to for days and I want it clean.

Google's [/teamwork post](https://research.google/blog/advancing-science-engineering-with-antigravitys-teamwork-feature/) (13 November 2026) found that tightly coupled code goes better as sequential implement-and-revise stages than as parallel splits. That's what I found in September, with far less data.

[Harness²](https://arxiv.org/abs/2610.14224) (9 October 2026) has the harness improve itself from its own runs. I do a manual version: every month or so an agent reads my recent prompts, and what works goes into `AGENTS.md` or a system prompt. I also built an orchestrator mode into an agent harness I work on, then removed it on 6 November, because the method was in how I brief.

Where I differ most is verification. Most advice puts a separate verifier agent next to the worker. I mostly verify myself, from screenshots, a real device, or a number that looks off ("586 is abnormal for a 1 day built project"). Reviewer agents are about 11% of my briefs.

## What doesn't work

I don't follow my own rules strictly. Main sessions that used agents still made a median of 21 edits themselves. "One at a time" turned into one lead per workstream: in 47 of 66 sessions with agents, two or more were alive at once.

Worktrees went both ways. In August I forbade them and put that in `AGENTS.md`. Now they live in a fixed folder, and this week's parallel polytini work used them. Both were right for the setup: one lead per repo doesn't need them, several leads in one repo do.

Some of the pattern isn't mine. Claude Code kept suggesting fan-out (one machine showed that tip over a thousand times), and in June a background Opus job launched three parallel agents without being asked.

It's also slow for small things. A brief and a review cost more than a one-line fix, so I only orchestrate multi-step work. In that window 66 of 163 sessions used agents, and most of the rest were one-message questions.
