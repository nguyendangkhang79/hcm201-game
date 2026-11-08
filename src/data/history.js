import { sources } from "./sources.js";
import { tourLocations } from "./tourLocations.js";
import { locationPhotos } from "./locationPhotos.js";

const laterLocations = [
  {
    id: "thong-nhat",
    title: "Dinh Độc Lập · Hội trường Thống Nhất",
    location: "Thành phố Hồ Chí Minh",
    date: "30.04 & 15–21.11.1975",
    event: "Từ thắng lợi mùa Xuân đến Hiệp thương thống nhất",
    image: "/history/palace.jpg",
    description:
      "Dinh Độc Lập là địa điểm gắn với thắng lợi ngày 30/4/1975, kết thúc chiến tranh và mở ra thời kỳ hòa bình, thống nhất. Cũng tại Hội trường Thống Nhất, Hội nghị Hiệp thương chính trị tháng 11/1975 bàn các bước thống nhất đất nước về mặt nhà nước. Hai sự kiện giúp phân biệt thống nhất lãnh thổ với quá trình xây dựng bộ máy nhà nước chung. Khi tìm hiểu, hãy nối mốc tháng 4 với Hiệp thương và cuộc Tổng tuyển cử năm 1976 để thấy sự tiếp nối của hành trình thống nhất.",
    sources: [sources.palace, sources.consultation, {
      title: "VR360 · Giới thiệu tour Dinh Độc Lập",
      url: "https://vr360.com.vn/dinh-doc-lap",
    }],
    visit: { type: "3d", url: "https://vr360.com.vn/projects/dinhdoclap/" },
    credit: {
      alt: "Xe tăng trưng bày trước Dinh Độc Lập, ảnh chụp năm 2013",
      author: "Clay Gilliland",
      version: "2.0",
      url: "https://commons.wikimedia.org/wiki/File:Independence_Palace_or_Reunification_Palace_(12110613104).jpg",
    },
    milestones: [
      ["30/4/1975", "Thắng lợi gắn với kết thúc chiến tranh."],
      ["15–21/11/1975", "Hiệp thương chính trị thống nhất đất nước."],
      ["25/4/1976", "Tổng tuyển cử bầu Quốc hội chung trên cả nước."],
    ],
  },
  {
    id: "ba-dinh",
    title: "Hội trường Ba Đình cũ",
    location: "Khu vực Ba Đình, Hà Nội",
    date: "1976 · 1982 · 1986",
    event: "Không gian của Quốc hội và các kỳ Đại hội Đảng",
    image: "/history/ba-dinh.jpg",
    description:
      "Hội trường Ba Đình cũ từng là nơi họp của Quốc hội và tổ chức các Đại hội IV, V, VI. Ba kỳ Đại hội tại đây giúp nối các quyết định xây dựng đất nước sau thống nhất với bước ngoặt Đổi mới năm 1986. Ảnh trên trang ghi lại hội trường trước khi công trình được tháo dỡ.",
    sources: [sources.hall, sources.iv, sources.v, sources.vi],
    visit: { type: "digital", url: sources.hall.url },
    credit: {
      alt: "Mặt tiền Hội trường Ba Đình cũ trước khi tháo dỡ",
      author: "joxeankoret",
      version: "2.0",
      url: "https://commons.wikimedia.org/wiki/File:Ba_Dinh_Hall_1462359227_71b04ee08a.jpg",
    },
    milestones: [
      ["12/1976", "Đại hội IV: đường lối xây dựng CNXH sau thống nhất."],
      ["3/1982", "Đại hội V: nhiệm vụ của chặng đường đầu tiên."],
      ["12/1986", "Đại hội VI: đường lối đổi mới toàn diện."],
    ],
    note: "Địa điểm lịch sử · Công trình gốc không còn tồn tại.",
  },
  {
    id: "ba-chuc",
    title: "Khu di tích Nhà mồ Ba Chúc",
    location: "Ba Chúc, An Giang",
    date: "THÁNG 04.1978",
    event: "Ký ức về chiến tranh bảo vệ biên giới Tây Nam",
    image: "/history/ba-chuc.jpg",
    description:
      "Nhà mồ Ba Chúc tưởng niệm những người dân bị lực lượng Khmer Đỏ sát hại vào tháng 4/1978 tại An Giang. Đây là chứng tích về tổn thất của nhân dân trong bối cảnh chiến tranh bảo vệ biên giới Tây Nam, giúp người học hiểu vì sao nhiệm vụ bảo vệ Tổ quốc vẫn cấp thiết sau năm 1975. Địa điểm được giới thiệu như một không gian tưởng niệm và học tập lịch sử. Không đồng nhất di tích với nơi diễn ra một trận thắng; khi đọc tư liệu, cần đặt sự kiện vào đúng bối cảnh và tôn trọng các nạn nhân.",
    sources: [sources.bachuc],
    visit: { type: "digital", url: sources.bachuc.url },
    credit: {
      alt: "Công trình tưởng niệm tại khu di tích Nhà mồ Ba Chúc",
      author: "Bùi Thụy Đào Nguyên",
      version: "4.0",
      url: "https://commons.wikimedia.org/wiki/File:Nhà_mồ_Ba_Chúc.jpg",
    },
    milestones: [
      ["4/1978", "Thảm sát thường dân tại Ba Chúc."],
      ["1979", "Xây dựng khu tưởng niệm."],
      ["1980", "Quần thể di tích được xếp hạng cấp quốc gia."],
    ],
  },
  {
    id: "po-hen",
    title: "Khu di tích lịch sử Pò Hèn",
    location: "Quảng Ninh",
    date: "17.02.1979",
    event: "Cuộc chiến đấu bảo vệ biên giới phía Bắc",
    description:
      "Pò Hèn gắn với cuộc chiến đấu ngày 17/2/1979 của cán bộ, chiến sĩ biên phòng và nhân dân tại Quảng Ninh. Di tích là điểm tìm hiểu nhiệm vụ bảo vệ chủ quyền biên giới phía Bắc trong giai đoạn sau thống nhất. Đọc câu chuyện Pò Hèn bên cạnh tư liệu về biên giới Tây Nam giúp nhận diện những khó khăn quốc phòng của đất nước cuối thập niên 1970.",
    sources: [sources.pohen],
    visit: { type: "info", url: null },
    milestones: [["17/2/1979", "Chiến đấu bảo vệ biên giới tại Pò Hèn."]],
    note: "Chưa có nguồn tham quan số được xác minh.",
  },
];

export const locations = [
  ...tourLocations,
  ...laterLocations.map((site) => ({ ...site, chapter: "reunification" })),
].map((site) => {
  const credit = locationPhotos[site.id];
  return credit ? { ...site, credit, image: `/history/${site.id}.webp` } : site;
});
