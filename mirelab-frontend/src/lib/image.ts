/** 아바타는 어디서도 이보다 크게 안 그린다 — 원본 그대로 올릴 이유가 없다 */
const AVATAR_SIZE = 512

/**
 * 고른 이미지를 정사각형으로 잘라 줄인 뒤 업로드용 Blob 으로 만든다.
 *
 * 브라우저에서 줄이는 이유: 요즘 휴대폰 사진은 한 장에 5MB 가 넘어 서버가 받기도 전에
 * 잘리고, 받아 봐야 아바타로는 512px 이면 충분하다. 서버는 크기·형식만 확인하면 되고
 * 이미지 처리 라이브러리를 들이지 않아도 된다.
 *
 * 이미지가 아니면 createImageBitmap 이 던진다 — 부르는 쪽이 안내 문구로 바꾼다.
 */
export async function toAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)

  try {
    // 짧은 변에 맞춰 가운데를 정사각형으로 자른다 — 아바타는 어차피 원으로 잘려 나온다
    const side = Math.min(bitmap.width, bitmap.height)
    const size = Math.min(side, AVATAR_SIZE)

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas 2d 컨텍스트를 만들 수 없습니다')

    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    )

    // webp 를 못 만드는 브라우저는 png 로 떨어뜨린다 — 서버가 둘 다 받는다.
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    )
    if (!blob) throw new Error('이미지를 변환하지 못했습니다')

    return blob
  } finally {
    bitmap.close()
  }
}
