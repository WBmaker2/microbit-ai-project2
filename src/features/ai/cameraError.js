const CAMERA_PERMISSION_MESSAGE = '카메라 권한이 차단되었습니다. 주소창의 카메라 권한을 허용한 뒤 다시 시작해 주세요.';

export function getCameraErrorMessage(error) {
  const detail = typeof error === 'string' ? error : error?.message || '';
  if (error?.name === 'NotAllowedError' || /permission\s+denied|notallowed|denied.*camera|camera.*denied/i.test(detail)) {
    return CAMERA_PERMISSION_MESSAGE;
  }
  if (error?.name === 'NotFoundError' || /requested device not found|no camera|camera.*not found/i.test(detail)) {
    return '사용할 카메라를 찾지 못했습니다. 카메라가 연결되어 있는지 확인해 주세요.';
  }
  return detail || '카메라를 시작하지 못했습니다. 권한과 연결을 확인한 뒤 다시 시도해 주세요.';
}
