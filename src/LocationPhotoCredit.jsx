export default function LocationPhotoCredit({ credit }) {
  return (
    <>
      Ảnh{" "}
      <a href={credit.url} target="_blank" rel="noreferrer">
        {credit.author} ↗
      </a>
      {credit.version && (
        <>
          {" · "}
          <a href={`https://creativecommons.org/licenses/by-sa/${credit.version}/`} target="_blank" rel="noreferrer">
            CC BY-SA {credit.version}
          </a>
          {" · Hiển thị thu nhỏ và cắt khung"}
        </>
      )}
    </>
  );
}
