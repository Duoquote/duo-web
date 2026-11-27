---
title: "How I run subagents: an orchestrator, a lead developer and the right order"
date: 2026-11-27
description: "How I use Claude Code subagents in late 2026: the main agent is my assistant on a project and works through subagents, one lead developer writes the code, work goes in order like a thread queue, and Haiku scouts read the code instead of a memory file. How it evolved, and how it compares with Anthropic, Cognition and Google."
summary:
  - "When I want something done in a project, I start the main Claude Code agent there as an orchestrator. It works like an assistant: it plans, briefs subagents and reviews their work, and the subagents write the code."
  - "Work goes in order, like queueing threads so they don't block each other. The point is the right order with fewer tokens, not speed. Hard items get split into steps for a lead developer, and a fresh agent starts when the context changes."
  - "No memories or decision lists. Haiku scouts read the code and report what's true now. Opus 5.5 at high effort runs the orchestrator and the lead, and Fable 5.2 at high does design work."
  - "It grew from 10-agent swarms in February 2026 to one writer per workstream in late September. It's close to Cognition's single-writer rule (April 2026) and to what Anthropic (22 October) and Google (13 November) published later."
tags: [ai, claude-code, agents, subagents]
draft: true
---

When I want something done in a project, I start the main Claude Code agent in that project and treat it as an orchestrator, in the literal sense. It's more like a partner or an assistant than a coder. It plans, writes briefs for subagents, reviews what they send back and tells me where things stand. The code gets written by the subagents.

This is how I work in late 2026. Models and tools change every few months, so it will probably look different next year.

Right now Opus 5.5 at high effort runs both the orchestrator and the lead developer. I used xhigh for months, but it takes forever to get things done, and high is smart enough. Since Fable 5.2 came out I use it at high for design work. It makes mockups and fixes design issues on a website better than Opus 5.5 does.

## Order, not speed

Running agents in sequence turned out to work well. It's kind of the same mindset as managing threads in a program. I always tried to queue work so items don't block each other, and agents come down to the same thing. The goal isn't getting things done faster. It's getting them done in the right order while spending fewer tokens.

So each workstream has one lead developer, an Opus agent I keep alive and brief one step at a time. When an item is hard, the orchestrator breaks it into steps and passes them to the lead, or to more than one developer when the steps really are separate. When the context changes, for example when the work moves to another part of the codebase, a fresh agent gets spawned so it can investigate that context itself.

## No memories

I don't use memories, and I think they're bad for this. Once an agent starts keeping a "decisions" list, the list grows until it doesn't fit in context, or it doesn't get read in full, and the part the agent needed is the part it skipped. Docs have the same problem once nobody updates them.

So Haiku agents read the code instead. The newer Haiku is really good at taking in a lot of data and finding where things are. A few Haiku scouts go through the code and directories and report to the main agent what's true now. It's always reliable that way, because the source is the code itself.

## How it got here

I went through this year's Claude Code history on both of my machines to check when each part showed up.

In February my first big request was "USE MULTIPLE AGENTS TO DO THE RESEARCH (PREFERABLY 10+ AGENTS)". In March and April the median swarm I asked for was 10 agents, almost all of it research. Even then I ran a quick scout pass first and fanned out with what it found. On 31 May I first told a session "you are an orchestrator to manage opus sub agents", and by early September I was telling it "do not work yourself".

Between 19 and 28 September I went from "do at most run 2 sub agents in parallel" to "one sub agent should be live at a time". Opus 5.5 arrived that same week and was really good at instructing subagents, so the model is part of why this works. By late October the setup was Haiku xhigh scouts, then one Opus xhigh lead developer. From 22 October to 27 November my main sessions launched 536 agents and sent 2,224 messages to agents that already existed. One agent got 219 messages in a single session. Since then I've moved the Opus agents down to high.

## How I brief and steer

I give the orchestrator the goal, the constraints and the shape of the team, and it writes the brief. The median one is about 4,700 characters. It opens with a role ("You are the lead developer for one feature in this repo. I am the orchestrator."), then a "Read first" list with `ARCHITECTURE.md` and `AGENTS.md`, then hard limits: read-only for scouts, no builds on the machine where a Rust build freezes the desktop, never print secrets, no commits before review.

The team usually fits in my first message. For my phone's ROM project, in October (lightly edited):

> Orient yourself around the codebase using haiku xhigh agents, 3 at most. After orientation we'll make changes using 1 single opus xhigh sub agent, as an orchestrator ourselves.

During a run I send short messages, often while the agent is still working. When I send a batch of fixes, the orchestrator queues them and briefs the lead one at a time as each task lands. When the exact wording is important, it quotes me: "PRIORITY change from the user. Pause 1.6 at a clean commit point, do this first, then continue 1.6." The quoting is there because of a mistake. Once the orchestrator wrote a rule into a brief that I never said, the lead built on it, and a later step had to undo it.

I also keep the gates. In August it was "when results land do wait for my command", and commits waited for a clean review. On 7 November I told one session to wait for my word before spawning scouts, then 48 minutes later told it not to wait between waves.

Parallel workstreams need plain rules. On 26 and 27 November I had up to six leads alive, one per workstream, among them [polytini](/polytini), its demo site and this blog. Two benchmark agents built gates that scanned for each other's processes and deadlocked, so the orchestrator replaced them with one shared lock. It also set the release order, 0.1.8 before 0.1.9. That's the thread queue again.

## Next to the published advice

[Anthropic's multi-agent research post](https://www.anthropic.com/engineering/multi-agent-research-system) (13 June 2025) is where the "up to 90%" research-time number comes from. It's about parallel subagents doing breadth-first research, like my early swarms, and it says coding with shared context isn't a good fit. That's the wall I hit.

[Cognition](https://cognition.com/blog/multi-agents-working) (22 April 2026) said multi-agent works when "writes stay single-threaded". My single lead is the same rule, and they published it months before I settled on it.

Anthropic's [When to fold subagents into your main agent loop](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) (22 October 2026) argues for fewer subagents and more skills and tools in one loop. I agree with fewer, but I fold the other way. The lead holds the working context, the scouts do the reading, and the main loop stays small, because it's the session I talk to for days.

Google's [/teamwork post](https://research.google/blog/advancing-science-engineering-with-antigravitys-teamwork-feature/) (13 November 2026) found that tightly coupled code goes better as sequential implement-and-revise stages than as parallel splits. That's the ordering point, from far more data than mine. [Harness²](https://arxiv.org/abs/2610.14224) (9 October 2026) has a harness improve itself from its own runs. My version is manual: every month or so an agent reads my recent prompts, and what works goes into `AGENTS.md` or a system prompt.

Where I differ most is verification. Most advice adds a separate verifier agent. I mostly verify myself, from screenshots, a real device, or a number that looks off. Reviewer agents are about 11% of my briefs.

## What doesn't work

I don't follow my own rules strictly. The main agent is supposed to work only through subagents, but sessions that used agents still made a median of 21 edits themselves. "One at a time" turned into one lead per workstream: in 47 of 66 sessions with agents, two or more were alive at once.

Worktrees went both ways. In August I forbade them. Now they live in a fixed folder, and this week's parallel polytini work used them. One lead per repo doesn't need them, several leads in one repo do.

Some of the pattern isn't mine. Claude Code kept suggesting fan-out, and in June a background Opus job launched three parallel agents without being asked.

It's also slow for small things. A brief and a review cost more than a one-line fix, so I only orchestrate multi-step work.
