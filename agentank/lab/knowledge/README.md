# Win-Rate Knowledge Base

This knowledge base is not a general AI reading list. It only keeps ideas that can improve the two primary AgentTank bots.

Every useful idea must connect to at least one of:
- Strategy rule.
- Experiment hypothesis.
- Replay metric.
- Candidate-code change.
- Opponent or map playbook.

## Source Standards

Prefer primary or implementation-adjacent sources:
- Official AgentTank guide.
- Official research posts or papers.
- Open-source game AI environments.
- Replay evidence from our own matches.

Do not copy an external method blindly. Translate it into the AgentTank runtime: one action per frame, queued commands, bullets, stars, skills, grass, dirt mounds, and leaderboard meta.

## Core References

- AgentTank Guide: https://agentank.ai/agent-guide
- AlphaGo: https://deepmind.google/research/alphago/
- AlphaGo Zero: https://deepmind.google/blog/alphago-zero-starting-from-scratch/
- AlphaStar: https://deepmind.google/blog/alphastar-grandmaster-level-in-starcraft-ii-using-multi-agent-reinforcement-learning/
- OpenAI Five: https://openai.com/index/openai-five/
- Dota 2 with large-scale reinforcement learning: https://openai.com/index/dota-2-with-large-scale-deep-reinforcement-learning/
- Tencent AI Arena / Honor of Kings: https://aiarena.tencent.com/hok/doc/
- Tencent hok_env: https://github.com/tencent-ailab/hok_env

## Reading Order

1. `agentank-mechanics.md`
2. `win-rate-methods.md`
3. `cards/value-functions.md`
4. `cards/partial-observability.md`
5. `cards/league-training.md`
6. `cards/exploiter-agents.md`
7. `cards/self-play.md`

