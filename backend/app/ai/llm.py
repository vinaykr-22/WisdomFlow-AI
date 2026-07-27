from collections.abc import Generator

from openai import OpenAI

from app.config import settings

SUMMARY_PROMPTS = {
    1: """You are an educational summarizer. Given the document text below, produce a 1-page brief overview (~500 words).
Include only:
- **Core Topic**: what this document is about
- **Key Points**: 3-5 main takeaways
- **Why It Matters**: practical significance

Be concise. Every sentence must carry meaning.

Document text:
{text}""",

    5: """You are an educational summarizer. Given the document text below, produce a 5-page detailed summary (~2500 words).
Include:
- **Overview**: what the document covers
- **Detailed Breakdown**: structured sections with sub-topics
- **Key Concepts**: definitions and explanations
- **Examples**: real-world applications where present
- **Conclusion**: summary of findings

Write in clear educational prose with section headings.

Document text:
{text}""",

    10: """You are an educational summarizer. Given the document text below, produce a 10-page comprehensive summary (~5000 words).
Include:
- **Executive Summary**: high-level overview
- **Section-by-Section Analysis**: detailed breakdown of each major topic
- **Key Concepts & Definitions**: thorough explanations
- **Examples & Case Studies**: where present in the document
- **Relationships**: how concepts connect to each other
- **Practical Applications**: how the knowledge applies
- **Conclusion**: synthesis of all material

Write in well-structured sections with clear headings. The summary should serve as a complete study reference. Mention where images, diagrams, or figures appear in the original document.

Document text:
{text}""",

    20: """You are an educational summarizer. Given the document text below, produce a 20-page comprehensive reference (~10000 words).
Include:
- **Executive Summary**
- **Full Topic Breakdown**: every major concept exhaustively covered
- **Detailed Definitions**: all key terms with clear explanations
- **Examples & Applications**: all examples from the document expanded
- **Relationships & Dependencies**: how concepts build on each other
- **Chapter/Section Summaries**: each major section summarized
- **Key Takeaways**: comprehensive list of what was learned
- **Study Questions**: questions for self-assessment
- **Further Reading**: references to related topics mentioned
- **Index of Terms**: quick reference of key terms

This is a complete reference document. Be thorough and exhaustive. Reference all images, diagrams, tables, and figures from the original document with descriptions of where they appear.

Document text:
{text}""",
}

CHAT_SYSTEM_PROMPT = """You are an AI tutor. Answer the user's question based on the provided document context.
If the context doesn't contain the answer, say so politely. Be concise but thorough.

Context:
{context}"""

VOICE_SYSTEM_PROMPT = """You are a warm, helpful, and engaging AI Voice Tutor having a natural spoken conversation with a student.

CRITICAL INSTRUCTIONS FOR SPOKEN VOICE RESPONSES:
- Speak naturally and conversationally, as a human tutor would in an oral session.
- ABSOLUTELY NO MARKDOWN FORMATTING:
  * Do NOT use headers, dividers, or underline symbols (#, ==, --, ===).
  * Do NOT use bold or italic symbols (**text**, *text*).
  * Do NOT use bullet points or numbered list dashes (*, -, 1.).
  * Do NOT use code blocks, tables, or ASCII art.
- Write ONLY plain, clean prose with standard sentence punctuation (periods, commas, question marks).
- Keep explanations clear, well-structured, direct, and pleasant to listen to when read aloud.
{context_section}"""

FLASHCARD_PROMPT = """You are an educational flashcard generator. Based on the document text below, generate {count} flashcards.
Return ONLY a valid JSON array (no markdown, no code fences). Each object must have:
- "front": string (the question or term)
- "back": string (the answer or definition)
- "hint": string or null (optional hint)

Document text:
{text}"""

QUIZ_PROMPT = """You are an educational assessment generator. Based on the document text below, generate {count} {difficulty} questions.
Return ONLY a valid JSON array (no markdown, no code fences). Each object must have:
- "question_type": "mcq" or "true_false"
- "question": string
- "options": object with A/B/C/D keys (for mcq) or null (for true_false)
- "correct_answer": string
- "explanation": string

Document text:
{text}"""


def _client(api_key: str | None = None, base_url: str | None = None):
    return OpenAI(
        api_key=api_key or settings.llm_api_key,
        base_url=base_url or settings.llm_base_url,
        timeout=60,
    )


def _call_llm(messages: list[dict], model: str | None = None, stream: bool = False, base_url: str | None = None) -> str | Generator[str, None, None]:
    model = model or settings.llm_model
    client = _client(base_url=base_url) if base_url else _client()
    resp = client.chat.completions.create(model=model, messages=messages, temperature=0.3, stream=stream)

    if stream:
        def gen():
            for chunk in resp:
                token = chunk.choices[0].delta.content or ""
                if token:
                    yield token
        return gen()

    return resp.choices[0].message.content or ""


def generate_summary(text: str, page_count: int = 5) -> str:
    prompt = SUMMARY_PROMPTS.get(page_count, SUMMARY_PROMPTS[5])
    limit = page_count * 3000  # ponytail: rough token budget per page
    errors = []
    try:
        result = _call_llm([{"role": "user", "content": prompt.format(text=text[:limit])}])
        return result if isinstance(result, str) else ""
    except Exception as e:
        errors.append(f"Primary LLM failed: {e}")

    try:
        result = _call_llm(
            [{"role": "user", "content": prompt.format(text=text[:limit])}],
            model="llama3:latest",
            base_url=settings.ollama_base_url,
        )
        return result if isinstance(result, str) else ""
    except Exception as e:
        errors.append(f"Fallback Ollama failed: {e}")

    raise RuntimeError(" | ".join(errors))


import json
import re


def generate_flashcards(text: str, count: int = 10) -> list[dict]:
    prompt = FLASHCARD_PROMPT.format(count=count, text=text[:30000])
    try:
        result = _call_llm([{"role": "user", "content": prompt}])
        raw = result if isinstance(result, str) else ""
        cards = _parse_json(raw)
        if cards:
            return cards
    except Exception:
        pass
    # fallback
    sentences = [s.strip() for s in text.split(".") if len(s.strip()) > 20]
    return [
        {"front": f"What is this about?", "back": s[:200], "hint": None}
        for s in sentences[:count]
    ]


def generate_quiz(text: str, difficulty: str = "medium", count: int = 5) -> list[dict]:
    prompt = QUIZ_PROMPT.format(count=count, difficulty=difficulty, text=text[:30000])
    errors = []

    try:
        result = _call_llm([{"role": "user", "content": prompt}])
        raw = result if isinstance(result, str) else ""
    except Exception as e:
        errors.append(f"Primary LLM failed: {e}")
        return _fallback_quiz(text, difficulty, count)

    questions = _parse_json(raw)
    if questions:
        return questions

    # fallback: try once more with explicit JSON instruction
    try:
        result = _call_llm([{"role": "user", "content": prompt + "\n\nReturn ONLY a JSON array, no other text."}])
        raw = result if isinstance(result, str) else ""
        questions = _parse_json(raw)
        if questions:
            return questions
    except Exception:
        pass

    # last resort: Ollama fallback
    try:
        result = _call_llm([{"role": "user", "content": prompt}], model="llama3:latest", base_url=settings.ollama_base_url)
        raw = result if isinstance(result, str) else ""
        questions = _parse_json(raw)
        if questions:
            return questions
    except Exception as e:
        errors.append(f"Ollama failed: {e}")

    raise RuntimeError(" | ".join(errors))


def _parse_json(raw: str) -> list[dict] | None:
    # strip markdown code fences if present
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
    return None


def _fallback_quiz(text: str, difficulty: str, count: int) -> list[dict]:
    """ponytail: hardcoded fallback if LLM is unreachable."""
    import random
    sentences = [s.strip() for s in text.split(".") if len(s.strip()) > 20]
    if not sentences:
        sentences = ["The document contains educational content."]
    questions = []
    for i in range(min(count, len(sentences))):
        q = {
            "question_type": "true_false",
            "question": f'Based on the document: "{sentences[i][:100]}..." is this correct?',
            "options": None,
            "correct_answer": "True",
            "explanation": "This statement is derived from the document content.",
        }
        questions.append(q)
    return questions


ROADMAP_PROMPT = """You are an educational roadmap generator. Based on the content below, generate a structured learning roadmap as a JSON object with this exact structure:
{{
  "title": "string — roadmap title",
  "description": "string — brief description",
  "estimated_hours": number,
  "nodes": [
    {{
      "node_id": "string like '1', '1.1', '2', '2.1'",
      "parent_node_id": null or "string like '1'",
      "title": "string",
      "description": "string",
      "type": "prerequisite|basic|intermediate|advanced|application|assessment",
      "difficulty": "easy|medium|hard",
      "estimated_minutes": number,
      "prerequisites": ["node_id strings"],
      "resources": [{{"title": "string", "url": "string or null", "type": "video|article|book|practice"}}]
    }}
  ]
}}

Rules:
- Start with prerequisites, then basic → intermediate → advanced → application → assessment
- Each node must have a unique node_id
- parent_node_id links to the parent topic (null for top-level)
- Include 8-15 nodes total
- Return ONLY the JSON object, no markdown fences, no extra text

Content:
{text}"""


ROADMAP_TOPIC_PROMPT = """You are an educational roadmap generator. The user wants to learn: {topic}

Generate a structured learning roadmap as a JSON object with this exact structure:
{{
  "title": "string — roadmap title",
  "description": "string — brief description",
  "estimated_hours": number,
  "nodes": [
    {{
      "node_id": "string like '1', '1.1', '2', '2.1'",
      "parent_node_id": null or "string like '1'",
      "title": "string",
      "description": "string",
      "type": "prerequisite|basic|intermediate|advanced|application|assessment",
      "difficulty": "easy|medium|hard",
      "estimated_minutes": number,
      "prerequisites": ["node_id strings"],
      "resources": [{{"title": "string", "url": "string or null", "type": "video|article|book|practice"}}]
    }}
  ]
}}

Rules:
- Start with prerequisites, then basic → intermediate → advanced → application → assessment
- Each node must have a unique node_id
- parent_node_id links to the parent topic (null for top-level)
- Include 8-15 nodes total
- Return ONLY the JSON object, no markdown fences, no extra text"""


def generate_roadmap(text: str | None = None, topic_name: str | None = None) -> dict:
    if topic_name:
        prompt = ROADMAP_TOPIC_PROMPT.format(topic=topic_name)
    elif text:
        prompt = ROADMAP_PROMPT.format(text=text[:30000])
    else:
        raise ValueError("Either text or topic_name required")

    errors = []
    try:
        result = _call_llm([{"role": "user", "content": prompt}])
        raw = result if isinstance(result, str) else ""
        data = _parse_json_single(raw)
        if data:
            return data
    except Exception as e:
        errors.append(f"Primary LLM failed: {e}")

    try:
        result = _call_llm([{"role": "user", "content": prompt}], model="llama3:latest", base_url=settings.ollama_base_url)
        raw = result if isinstance(result, str) else ""
        data = _parse_json_single(raw)
        if data:
            return data
    except Exception as e:
        errors.append(f"Ollama failed: {e}")

    raise RuntimeError(" | ".join(errors))


def _parse_json_single(raw: str) -> dict | None:
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return None


def chat_completion(
    messages: list[dict],
    context: str = "",
    stream: bool = False,
    voice_mode: bool = False,
) -> str | Generator[str, None, None]:
    if voice_mode:
        if context:
            ctx_text = f"Use the following document context to inform your answer:\n{context}"
        else:
            ctx_text = "No document is currently selected. Rely on your general knowledge to answer."
        sys_content = VOICE_SYSTEM_PROMPT.format(context_section=ctx_text)
        messages = [{"role": "system", "content": sys_content}] + list(messages)
    elif context:
        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT.format(context=context)}] + list(messages)

    errors = []
    try:
        return _call_llm(messages, stream=stream)
    except Exception as e:
        errors.append(f"Primary LLM failed: {e}")

    try:
        return _call_llm(messages, model="llama3:latest", stream=stream, base_url=settings.ollama_base_url)
    except Exception as e:
        errors.append(f"Fallback Ollama failed: {e}")

    raise RuntimeError(" | ".join(errors))


REVISION_PROMPT = """You are a revision planner. Based on the user's documents and learning data below, generate a {plan_type} revision plan.

Documents with quiz performance:
{doc_performance}

Flashcard sets:
{flashcard_data}

Roadmap progress:
{roadmap_data}

User's average quiz score: {avg_score}%

Return ONLY a JSON object (no markdown) with this structure:
{{
  "title": "string — plan title",
  "items": [
    {{
      "topic": "string",
      "source_name": "string — document name or topic",
      "priority": "high|medium|low",
      "estimated_minutes": number,
      "activities": ["review flashcards", "take quiz", "read summary", "practice problems"],
      "reason": "string — why this is priority (e.g. '45% quiz score')"
    }}
  ],
  "total_estimated_minutes": number
}}

Rules:
- Prioritize topics with lowest quiz scores first
- Include 5-8 items for daily, 10-15 for weekly
- Be realistic with time estimates
- Every item must have a clear reason tied to the data above"""


def generate_revision_plan(plan_type: str, doc_performance: str, flashcard_data: str, roadmap_data: str, avg_score: float) -> dict:
    prompt = REVISION_PROMPT.format(
        plan_type=plan_type,
        doc_performance=doc_performance,
        flashcard_data=flashcard_data,
        roadmap_data=roadmap_data,
        avg_score=round(avg_score, 1),
    )
    errors = []
    try:
        result = _call_llm([{"role": "user", "content": prompt}])
        raw = result if isinstance(result, str) else ""
        data = _parse_json_single(raw)
        if data:
            return data
    except Exception as e:
        errors.append(f"Primary LLM failed: {e}")

    try:
        result = _call_llm([{"role": "user", "content": prompt}], model="llama3:latest", base_url=settings.ollama_base_url)
        raw = result if isinstance(result, str) else ""
        data = _parse_json_single(raw)
        if data:
            return data
    except Exception as e:
        errors.append(f"Ollama failed: {e}")

    raise RuntimeError(" | ".join(errors))


PODCAST_PROMPT = """You are a scriptwriter for an educational podcast. Based on the document text below, generate a short 2-person podcast script.
The script should be conversational, engaging, and easy to listen to. Host A is the expert, and Host B is the curious student.
Return ONLY a valid JSON array of objects (no markdown, no code fences). Each object must have:
- "speaker": "A" or "B"
- "text": string (what they say)

Make sure the podcast covers the main points of the document in about 5-8 exchanges.

Document text:
{text}"""

def generate_podcast_script(text: str) -> list[dict]:
    prompt = PODCAST_PROMPT.format(text=text[:30000])
    errors = []
    try:
        result = _call_llm([{"role": "user", "content": prompt}])
        raw = result if isinstance(result, str) else ""
        data = _parse_json(raw)
        if data:
            return data
    except Exception as e:
        errors.append(f"Primary LLM failed: {e}")

    try:
        result = _call_llm([{"role": "user", "content": prompt}], model="llama3:latest", base_url=settings.ollama_base_url)
        raw = result if isinstance(result, str) else ""
        data = _parse_json(raw)
        if data:
            return data
    except Exception as e:
        errors.append(f"Ollama failed: {e}")

    raise RuntimeError(" | ".join(errors))
