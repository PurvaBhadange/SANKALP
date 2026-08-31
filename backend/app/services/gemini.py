import urllib.request
import urllib.error
import json
import os
import base64
from datetime import datetime
from app.core.config import settings


def _generate_smart_fallback_structuring(raw_text: str) -> dict:
    sentences = [s.strip() for s in raw_text.replace('\n', '.').split('.') if len(s.strip()) > 10]
    outcomes = sentences[:3] if sentences else [
        "Deploy innovative technology solution to address public sector challenge",
        "Achieve target operational efficiency and performance improvements"
    ]
    return {
        "outcomes": outcomes,
        "suggested_kpis": [
            {"name": "Operational Efficiency & Target Yield", "unit": "%", "target_direction": "increase"},
            {"name": "Resource / Water Consumption Reduction", "unit": "%", "target_direction": "decrease"},
            {"name": "Implementation & Pilot Deployment Time", "unit": "days", "target_direction": "decrease"}
        ],
        "scope": f"Phase 1 trial pilot deployment across targeted operational zones. Problem context: {raw_text[:250]}...",
        "constraints": [
            "Must comply with state government data security and privacy guidelines",
            "Solution must be scalable across district and state administrative zones",
            "Must provide real-time dashboard telemetry and reporting"
        ],
        "suggested_sector": "AgriTech",
        "ai_generated": False,
        "fallback_used": True
    }


def structure_challenge(raw_text: str, model_name: str = "gemini-3.6-flash") -> dict:
    # Read API key from env or settings fallback
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        return {
            "success": True,
            "data": _generate_smart_fallback_structuring(raw_text),
            "ai_generated": False,
            "model_name": "smart-rule-fallback",
            "timestamp": datetime.utcnow().isoformat(),
            "raw_response": "Smart structuring fallback generated from problem statement (API key unconfigured)"
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
    prompt = (
        "Analyze the following government challenge statement and structure it. You must return ONLY a raw JSON object matching the requested schema. Do not include markdown fences, preamble, or explain anything.\n"
        "Schema:\n"
        "{\n"
        '  "outcomes": [list of measurable outcome statements],\n'
        '  "suggested_kpis": [{"name": str, "unit": str, "target_direction": "increase"|"decrease"}],\n'
        '  "scope": str,\n'
        '  "constraints": [list of constraints/exclusions],\n'
        '  "suggested_sector": str\n'
        "}\n\n"
        f"Challenge Statement:\n{raw_text}"
    )

    body = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        # 30-second timeout for the remote model call
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            
            try:
                candidate = res_body["candidates"][0]
                text_output = candidate["content"]["parts"][0]["text"]
            except (KeyError, IndexError) as e:
                return {
                    "success": True,
                    "data": _generate_smart_fallback_structuring(raw_text),
                    "ai_generated": False,
                    "model_name": "smart-rule-fallback",
                    "timestamp": datetime.utcnow().isoformat(),
                    "raw_response": text_output
                }

            # Parse text_output as JSON defensively
            cleaned_text = text_output.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if len(lines) > 2:
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
            
            try:
                parsed_json = json.loads(cleaned_text)
                parsed_json["ai_generated"] = True
                return {
                    "success": True,
                    "data": parsed_json,
                    "ai_generated": True,
                    "model_name": model_name,
                    "timestamp": datetime.utcnow().isoformat(),
                    "raw_response": text_output
                }
            except json.JSONDecodeError as e:
                return {
                    "success": True,
                    "data": _generate_smart_fallback_structuring(raw_text),
                    "ai_generated": False,
                    "model_name": "smart-rule-fallback",
                    "timestamp": datetime.utcnow().isoformat(),
                    "raw_response": text_output
                }

    except Exception as e:
        # Gracefully handle HTTPError 429, timeouts, and network errors by returning high-quality fallback
        return {
            "success": True,
            "data": _generate_smart_fallback_structuring(raw_text),
            "ai_generated": False,
            "model_name": "smart-rule-fallback",
            "timestamp": datetime.utcnow().isoformat(),
            "raw_response": f"Smart structuring fallback generated from problem statement (Network/RateLimit: {str(e)})"
        }


def generate_embedding(text: str, model_name: str = "gemini-embedding-001"):
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        print("WARNING: GEMINI_API_KEY missing, skipping embedding generation.")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:embedContent?key={api_key}"

    body = {
        "model": f"models/{model_name}",
        "content": {
            "parts": [{
                "text": text
            }]
        },
        "outputDimensionality": 768
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            vec = res_body.get("embedding", {}).get("values")
            if vec and isinstance(vec, list):
                return vec
            print(f"WARNING: Gemini embedding response missing values: {res_body}")
            return None
    except urllib.error.HTTPError as e:
        print(f"WARNING: Gemini embedding API returned error {e.code}: {e.read().decode('utf-8')}")
        return None
    except Exception as e:
        print(f"WARNING: Failed to generate embedding via Gemini API: {e}")
        return None


def verify_document_claim(file_path: str, claimed_field: str, claimed_value: str, model_name: str = "gemini-3.6-flash") -> dict:
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        return {
            "extracted_value": None,
            "matches_claim": False,
            "confidence": "low",
            "ai_generated": False,
            "error": "API_KEY_MISSING",
            "note": "GEMINI_API_KEY missing"
        }

    if not os.path.exists(file_path):
        return {
            "extracted_value": None,
            "matches_claim": False,
            "confidence": "high",
            "ai_generated": False,
            "error": "FILE_NOT_FOUND",
            "note": "no document provided or file missing"
        }

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        ext = os.path.splitext(file_path)[1].lower()
        if ext in [".txt", ".json", ".csv"]:
            doc_text = file_bytes.decode("utf-8", errors="ignore")
            prompt = (
                f"You are an automated government document verification auditor. "
                f"DOCUMENT CONTENT:\n\"\"\"\n{doc_text}\n\"\"\"\n\n"
                f"Inspect the document content and locate the claimed field '{claimed_field}'. "
                f"The declared value for this field is '{claimed_value}'. "
                f"Extract the actual value present in the document for '{claimed_field}' and determine whether it matches the declared value. "
                f"Return ONLY a raw JSON object with keys:\n"
                f'{{\n'
                f'  "extracted_value": "string or null",\n'
                f'  "matches_claim": true|false,\n'
                f'  "confidence": "high"|"medium"|"low"\n'
                f'}}\n'
            )
            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
        else:
            mime_type = "application/pdf"
            if ext in [".png", ".jpg", ".jpeg"]:
                mime_type = f"image/{ext[1:]}"

            encoded_data = base64.b64encode(file_bytes).decode("utf-8")
            prompt = (
                f"You are an automated government document verification auditor. "
                f"Inspect the attached document and locate the claimed field '{claimed_field}'. "
                f"The declared value for this field is '{claimed_value}'. "
                f"Extract the actual value present in the document for '{claimed_field}' and determine whether it matches the declared value. "
                f"Return ONLY a raw JSON object with keys:\n"
                f'{{\n'
                f'  "extracted_value": "string or null",\n'
                f'  "matches_claim": true|false,\n'
                f'  "confidence": "high"|"medium"|"low"\n'
                f'}}\n'
            )
            body = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": encoded_data
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=25) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            try:
                candidate = res_body["candidates"][0]
                text_output = candidate["content"]["parts"][0]["text"].strip()
                if text_output.startswith("```"):
                    lines = text_output.splitlines()
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines[-1].startswith("```"):
                        lines = lines[:-1]
                    text_output = "\n".join(lines).strip()
                parsed = json.loads(text_output)
                parsed["ai_generated"] = True
                return parsed
            except Exception as e:
                return {
                    "extracted_value": None,
                    "matches_claim": False,
                    "confidence": "low",
                    "ai_generated": False,
                    "error": f"JSON_PARSE_ERROR: {str(e)}",
                    "raw_output": res_body
                }
    except Exception as e:
        print(f"WARNING: verify_document_claim error: {e}")
        return {
            "extracted_value": None,
            "matches_claim": False,
            "confidence": "low",
            "ai_generated": False,
            "error": str(e)
        }


def generate_evaluator_briefing(
    challenge_title: str,
    challenge_outcomes_json: dict | None,
    startup_name: str,
    startup_description: str,
    model_name: str = "gemini-3.6-flash"
) -> dict:
    """
    Generates a neutral, factual AI briefing for expert evaluators.
    Returns dict with briefing text and ai_generated boolean.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        return {
            "briefing": (
                f"EVALUATOR BRIEFING (Fallback - API key unavailable):\n\n"
                f"Challenge Title: {challenge_title}\n"
                f"Applicant: {startup_name}\n\n"
                f"Startup Description:\n{startup_description}\n\n"
                f"Please review the applicant's submitted documents and challenge problem statement manually."
            ),
            "ai_generated": False
        }

    outcomes_str = json.dumps(challenge_outcomes_json, indent=2) if challenge_outcomes_json else "N/A"

    prompt = (
        "You are an impartial executive analyst preparing a neutral, factual briefing document for expert panel evaluators.\n"
        "Your task is to compare the applicant startup's proposed solution against the challenge outcomes and requirements.\n\n"
        "CRITICAL INSTRUCTION: You MUST maintain complete neutrality. DO NOT provide score suggestions, ratings, numbers (e.g. '8/10'), or recommendations on whether to pass/fail or select the startup. Simply summarize alignment, strengths relative to stated goals, and areas that remain unclear or missing.\n\n"
        f"CHALLENGE TITLE: {challenge_title}\n"
        f"CHALLENGE STRUCTURED OUTCOMES:\n{outcomes_str}\n\n"
        f"APPLICANT STARTUP NAME: {startup_name}\n"
        f"STARTUP SOLUTION DESCRIPTION:\n{startup_description}\n\n"
        "Please provide a structured, neutral briefing covering:\n"
        "1. Executive Alignment Summary\n"
        "2. Core Strengths & Addressed Requirements\n"
        "3. Areas Requiring Evaluator Clarification or Verification\n"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            candidate = res_body["candidates"][0]
            briefing_text = candidate["content"]["parts"][0]["text"].strip()
            return {
                "briefing": briefing_text,
                "ai_generated": True
            }
    except Exception as e:
        print(f"WARNING: generate_evaluator_briefing error: {e}")
        return {
            "briefing": (
                f"EVALUATOR BRIEFING (Fallback - AI generation service temporarily unavailable):\n\n"
                f"Challenge Title: {challenge_title}\n"
                f"Applicant: {startup_name}\n\n"
                f"Startup Description:\n{startup_description}\n\n"
                f"Note: Remote AI briefing service returned: {str(e)}. Please evaluate using primary documentation."
            ),
            "ai_generated": False
        }


def draft_pilot_contract(
    challenge_title: str,
    challenge_outcomes_json: dict | None,
    startup_name: str,
    startup_description: str,
    model_name: str = "gemini-3.6-flash"
) -> dict:
    """
    Calls Gemini to generate AI-proposed contract draft.
    Returns dict with proposed terms and ai_generated boolean.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        return {
            "ip_ownership_terms": f"Background IP remains with {startup_name}. Foreground IP developed specifically for the challenge shall be co-owned by the Government Department and {startup_name} with non-exclusive perpetual government deployment rights.",
            "data_ownership_terms": "All operational data, telemetry, and diagnostic results generated during the pilot deployment belong exclusively to the Government Department.",
            "suggested_milestones": [
                {
                    "title": "Phase 1: Environment Setup & Data Pipeline Integration",
                    "description": "Deployment of baseline analytics pipeline and integration with department sandbox.",
                    "days_from_start": 30,
                    "payment_percentage": 30.0
                },
                {
                    "title": "Phase 2: Pilot Deployment & Model Evaluation",
                    "description": "Full field deployment and performance benchmark evaluation against target KPIs.",
                    "days_from_start": 90,
                    "payment_percentage": 50.0
                },
                {
                    "title": "Phase 3: Final Technical Report & Handover",
                    "description": "Comprehensive report submission, code handover, and executive briefing.",
                    "days_from_start": 120,
                    "payment_percentage": 20.0
                }
            ],
            "ai_generated": False
        }

    outcomes_str = json.dumps(challenge_outcomes_json, indent=2) if challenge_outcomes_json else "N/A"

    prompt = (
        "You are an AI legal and procurement contract assistant for a government innovation platform.\n"
        "Draft a proposed pilot contract agreement between the government department and the startup.\n"
        "You MUST return ONLY a raw JSON object with the exact schema below. Do not include markdown code block backticks or preamble.\n\n"
        "Schema:\n"
        "{\n"
        '  "ip_ownership_terms": "detailed proposed Intellectual Property terms",\n'
        '  "data_ownership_terms": "detailed proposed Data ownership & confidentiality terms",\n'
        '  "suggested_milestones": [\n'
        '    {\n'
        '      "title": "string",\n'
        '      "description": "string",\n'
        '      "days_from_start": int,\n'
        '      "payment_percentage": float\n'
        '    }\n'
        '  ]\n'
        "}\n\n"
        f"CHALLENGE TITLE: {challenge_title}\n"
        f"STRUCTURED OUTCOMES:\n{outcomes_str}\n\n"
        f"STARTUP NAME: {startup_name}\n"
        f"STARTUP DESCRIPTION:\n{startup_description}\n"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            candidate = res_body["candidates"][0]
            text_output = candidate["content"]["parts"][0]["text"].strip()
            if text_output.startswith("```"):
                lines = text_output.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                text_output = "\n".join(lines).strip()
            parsed = json.loads(text_output)
            parsed["ai_generated"] = True
            return parsed
    except Exception as e:
        print(f"WARNING: draft_pilot_contract error: {e}")
        return {
            "ip_ownership_terms": f"Background IP remains with {startup_name}. Foreground IP developed specifically for the challenge shall be co-owned with non-exclusive perpetual government deployment rights.",
            "data_ownership_terms": "All operational data, telemetry, and diagnostic results generated during the pilot deployment belong exclusively to the Government Department.",
            "suggested_milestones": [
                {
                    "title": "Phase 1: Environment Setup & Baseline Integration",
                    "description": "Baseline deployment and integration.",
                    "days_from_start": 30,
                    "payment_percentage": 40.0
                },
                {
                    "title": "Phase 2: Full Field Evaluation & Handover",
                    "description": "Full pilot evaluation and report delivery.",
                    "days_from_start": 90,
                    "payment_percentage": 60.0
                }
            ],
            "ai_generated": False,
            "error": str(e)
        }


def generate_pilot_performance_summary(
    challenge_title: str,
    startup_name: str,
    kpis_list: list,
    model_name: str = "gemini-3.5-flash"
) -> dict:
    """
    Calls Gemini to generate a factual, structured performance narrative.
    Explicitly blocks Gemini from rendering recommendations.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        return {
            "summary": "AI performance summary temporarily unavailable (API key missing).",
            "ai_generated": False
        }

    kpis_str = json.dumps(kpis_list, indent=2)

    prompt = (
        "You are an impartial innovation procurement analyst reviewing a pilot project's metrics.\n"
        "Your task is to generate a neutral, factual narrative summarizing progress against defined Key Performance Indicators (KPIs).\n\n"
        "CRITICAL INSTRUCTION: You MUST NOT make recommendations to scale-up, extend, reject, approve, or cancel the pilot project. "
        "Strictly analyze historical numbers, which targets are on track or behind, and notable patterns or trends in measurement.\n\n"
        f"Challenge: {challenge_title}\n"
        f"Startup: {startup_name}\n"
        f"KPI Metrics and Historical Measurements:\n{kpis_str}\n\n"
        "Structure your response with simple, professional headers:\n"
        "- Executive Metrics Summary\n"
        "- KPIs On-Track / Achieved\n"
        "- KPIs Behind Target / At-Risk\n"
        "- Data Patterns & Measurement Frequency Insights\n"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            candidate = res_body["candidates"][0]
            summary_text = candidate["content"]["parts"][0]["text"].strip()
            return {
                "summary": summary_text,
                "ai_generated": True
            }
    except Exception as e:
        print(f"WARNING: generate_pilot_performance_summary error: {e}")
        return {
            "summary": "AI performance summary temporarily unavailable.",
            "ai_generated": False
        }




