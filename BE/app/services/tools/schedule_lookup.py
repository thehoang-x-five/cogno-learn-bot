"""
Schedule Lookup Tool - Query exam schedules from database.
"""
import logging
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.schedule import ExamSchedule, ExamType

logger = logging.getLogger(__name__)


class ScheduleLookup:
    """Tool for looking up exam schedules."""

    def __init__(self, db: Session):
        self.db = db

    async def lookup(
        self,
        query: str,
        course_id: int,
        exam_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Look up exam schedules for a course.

        Args:
            query: User's original question.
            course_id: Course ID to query.
            exam_type: Optional structured tool-call argument.
        """
        try:
            query_lower = query.lower()
            target_type = self._resolve_exam_type(query_lower, exam_type)

            now = datetime.now()
            query_filter = and_(
                ExamSchedule.course_id == course_id,
                ExamSchedule.exam_date >= now,
            )
            if target_type:
                query_filter = and_(query_filter, ExamSchedule.exam_type == target_type)

            schedules = (
                self.db.query(ExamSchedule)
                .filter(query_filter)
                .order_by(ExamSchedule.exam_date)
                .all()
            )

            if not schedules:
                return {
                    "response": (
                        "Hiện tại chưa có lịch thi nào được công bố cho môn học này. "
                        "Vui lòng liên hệ giảng viên hoặc kiểm tra lại sau."
                    ),
                    "metadata": {
                        "schedules": [],
                        "count": 0,
                        "target_type": target_type.value if target_type else "all",
                    },
                }

            response_parts = ["Lịch thi môn học:"]
            schedule_data = []
            for schedule in schedules:
                exam_type_vn = self._translate_exam_type(schedule.exam_type)
                date_str = schedule.exam_date.strftime("%d/%m/%Y %H:%M")
                duration_str = f"{schedule.duration_minutes} phút"

                response_parts.append("")
                response_parts.append(exam_type_vn)
                response_parts.append(f"- Ngày thi: {date_str}")
                response_parts.append(f"- Thời gian: {duration_str}")

                if schedule.location:
                    response_parts.append(f"- Địa điểm: {schedule.location}")
                if schedule.notes:
                    response_parts.append(f"- Ghi chú: {schedule.notes}")

                schedule_data.append({
                    "id": schedule.id,
                    "type": schedule.exam_type.value,
                    "date": schedule.exam_date.isoformat(),
                    "duration_minutes": schedule.duration_minutes,
                    "location": schedule.location,
                    "notes": schedule.notes,
                })

            response_parts.append("")
            response_parts.append("Lưu ý: Vui lòng có mặt trước 15 phút để làm thủ tục dự thi.")

            return {
                "response": "\n".join(response_parts),
                "metadata": {
                    "schedules": schedule_data,
                    "count": len(schedules),
                    "target_type": target_type.value if target_type else "all",
                },
            }

        except Exception as exc:
            logger.error("Schedule lookup error: %s", exc, exc_info=True)
            return {
                "response": (
                    "Đã xảy ra lỗi khi tra cứu lịch thi. "
                    "Vui lòng thử lại sau hoặc liên hệ phòng đào tạo."
                ),
                "metadata": {
                    "error": str(exc),
                    "schedules": [],
                    "count": 0,
                },
            }

    def _translate_exam_type(self, exam_type: ExamType) -> str:
        translations = {
            ExamType.midterm: "Thi giữa kỳ",
            ExamType.final: "Thi cuối kỳ",
            ExamType.quiz: "Kiểm tra",
            ExamType.practical: "Thi thực hành",
        }
        return translations.get(exam_type, exam_type.value)

    def _resolve_exam_type(
        self,
        query_lower: str,
        explicit_exam_type: Optional[str],
    ) -> Optional[ExamType]:
        """Prefer structured function-call args, then fall back to query parsing."""
        if explicit_exam_type and explicit_exam_type != "all":
            try:
                return ExamType(explicit_exam_type)
            except ValueError:
                logger.warning("Unknown exam_type argument: %s", explicit_exam_type)

        if "giữa kỳ" in query_lower or "mid" in query_lower:
            return ExamType.midterm
        if "cuối kỳ" in query_lower or "final" in query_lower:
            return ExamType.final
        if "thực hành" in query_lower or "practical" in query_lower or "lab" in query_lower:
            return ExamType.practical
        if "kiểm tra" in query_lower or "quiz" in query_lower:
            return ExamType.quiz
        return None
