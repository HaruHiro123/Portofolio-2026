// Konten proyek dan dokumentasi dipertahankan dari portofolio asli Wahyu.
        /* --- Format Code GEE Snippet --- */
        const geeCodeStr = `/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var gistda = ee.FeatureCollection("projects/research-project-sentinel/assets/banjir_nakhon_pathom"),
    tanah = ee.Image("projects/research-project-sentinel/assets/soil_type2");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// FILTER AREA SPESIFIK KECAMATAN TERDAMPAK
var nakhonPathom = ee.FeatureCollection("FAO/GAUL/2015/level2")
    .filter(ee.Filter.eq('ADM1_NAME', 'Nakhon Pathom'))
    .filter(ee.Filter.inList('ADM2_NAME', ['Bang Len', 'Nakhon Chai Si']));

Map.centerObject(nakhonPathom, 11);

// FUNGSI UTAMA UNTUK EKSTRAKSI DATA RADAR SENTINEL-1
var getRadarImage = function(startDate, endDate, type) {
  var collection = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(nakhonPathom)
      .filterDate(startDate, endDate)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'));
  
  var rawImage = (type === 'banjir') ? collection.select('VV').min() : collection.select('VV').median();
  return rawImage.clip(nakhonPathom).focal_median(20, 'circle', 'meters'); // Speckle filter 20m
};

// EKSTRAKSI KONDISI BANJIR (2021 & 2022) DAN KONDISI KERING (NORMAL)
var radar_banjir_2021 = getRadarImage('2021-10-01', '2021-11-30', 'banjir'); // Badai Dianmu
var radar_banjir_2022 = getRadarImage('2022-09-25', '2022-11-10', 'banjir'); // Topan Noru
var radar_kering_normal  = getRadarImage('2020-01-01', '2020-07-31', 'kering'); // Fase Kering / Normal

// PROSES VARIABEL TOPOGRAFI (SRTM)
var srtm = ee.Image("USGS/SRTMGL1_003").clip(nakhonPathom);
var slope = ee.Terrain.slope(srtm);

// PENYIAPAN VARIABEL JENIS TANAH
var tanah_clip = tanah.select(0).clip(nakhonPathom).rename('soil_type');

// PREPARATION FOR MACHINE LEARNING STACK
var stack_analisis_2021 = radar_banjir_2021.rename('VV_Banjir')
    .addBands(radar_kering_normal.rename('VV_Normal'))
    .addBands(srtm.rename('elevation'))
    .addBands(slope.rename('slope'))
    .addBands(tanah_clip);

print('Variabel Latihan Lengkap (Ready untuk ML):', stack_analisis_2021.bandNames());

// =================================================================
// VISUALISASI DATA PADA KANVAS PETA
// =================================================================
var radarVis = {min: -22, max: -8, bands: ['VV']};
var terrainVis = {min: 0, max: 20, palette: ['blue', 'green', 'yellow']};

Map.clear();

Map.addLayer(radar_kering_normal, radarVis, '1. Kondisi Kering / Normal');
Map.addLayer(radar_banjir_2021, radarVis, '2. Kondisi Banjir 2021 (Badai Dianmu)');
Map.addLayer(radar_banjir_2022, radarVis, '3. Kondisi Banjir 2022 (Topan Noru)');

Map.addLayer(srtm, terrainVis, '4. Elevasi DEM', false);
Map.addLayer(tanah_clip, {}, '5. Jenis Tanah (Input ML)', false);
Map.addLayer(gistda, {color: 'red'}, '6. Titik Validasi Historis GISTDA', false);
Map.addLayer(nakhonPathom, {color: 'yellow'}, 'Batas Kecamatan Fokus', false);

// =================================================================
// SIMPLE MACHINE LEARNING (THE CORE) - SPATIAL PROXY
// =================================================================

var labelBanjir = gistda.filter(ee.Filter.gt('y_2011', 0)) 
    .map(function(f) { return f.set('Label', 1); });

var bandsUntukML = ['VV_Banjir', 'VV_Normal', 'elevation', 'slope', 'soil_type'];

var sampelBanjir = stack_analisis_2021.select(bandsUntukML).sampleRegions({
  collection: labelBanjir, properties: ['Label'], scale: 10, tileScale: 4 
});

var sampelDarat = stack_analisis_2021.select(bandsUntukML).sample({
  region: nakhonPathom, scale: 10, numPixels: 1000, geometries: true
}).map(function(f) { return f.set('Label', 0); });

var trainingDataRaw = sampelBanjir.merge(sampelDarat);
var trainingData = trainingDataRaw.filter(ee.Filter.notNull(bandsUntukML));

print('--- STATUS DATA TRAINING ---');
print('1. Jumlah Sampel Banjir (via 2011):', sampelBanjir.size());
print('2. Jumlah Sampel Darat:', sampelDarat.size());
print('3. Total Data Siap Train:', trainingData.size());

var classifier = ee.Classifier.smileRandomForest(50)
  .train({ features: trainingData, classProperty: 'Label', inputProperties: bandsUntukML });

var hasilKlasifikasi = stack_analisis_2021.select(bandsUntukML).classify(classifier);

Map.addLayer(hasilKlasifikasi.updateMask(hasilKlasifikasi.eq(1)), 
  {palette: ['#ff0000']}, 
  'HASIL ML: Prediksi Banjir 2021 (Model Latih 2011)'
);`;

        const codeBlockHtml = `<div class="code-container"><pre><code>${geeCodeStr.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre></div>`;

        /* --- Data Modal Berisi Kumpulan Asset (Support EN Translation) --- */
        const modalData = {
            'proj1': {
                title: 'Pendeteksian Banjir Nakhon Phanom',
                title_en: 'Nakhon Phanom Flood Detection',
                desc: `Eksplorasi Pendeteksian Banjir di daerah Nakhon Phanom, Thailand menggunakan Machine Learning (Random Forest) dan platform Google Earth Engine (GEE).
                <br><br>
                <b style="color:var(--text-primary);">Mengapa Genangan Air Ditampilkan Hitam Pekat?</b><br>
                Pada citra satelit radar Sentinel-1, permukaan air yang tenang bertindak layaknya cermin (<i>specular reflector</i>). Sinyal radar yang dipancarkan akan dipantulkan menjauhi satelit, menghasilkan nilai pantulan balik (<i>backscatter</i> VV) yang sangat rendah. Melalui parameter kode <code>.min()</code>, sistem mengekstrak nilai minimum dari periode waktu terjadinya badai/topan. Alhasil, <b>area yang tergenang banjir akan terisolasi dan tervisualisasi menjadi area berwarna hitam pekat</b>.
                ${codeBlockHtml}`,
                desc_en: `Exploration of Flood Detection in the Nakhon Phanom area, Thailand using Machine Learning (Random Forest) and the Google Earth Engine (GEE) platform.
                <br><br>
                <b style="color:var(--text-primary);">Why are puddles displayed pitch black?</b><br>
                On Sentinel-1 radar satellite imagery, still water acts as a mirror (<i>specular reflector</i>). The emitted radar signal reflects away from the satellite, resulting in a very low backscatter value (VV). Through the <code>.min()</code> parameter, the system extracts the minimum value from the storm/typhoon period. As a result, <b>flooded areas are isolated and visualized as pitch-black areas</b>.
                ${codeBlockHtml}`,
                img: 'images/image_1a5e6a.png',
                link: '',
                linkText: 'Kunjungi Tautan',
                linkText_en: 'Visit Link'
            },
            'proj2': {
                title: 'AeroInspect360',
                title_en: 'AeroInspect360 System',
                desc: 'Membuat website pelaporan inspeksi untuk Bandar Udara Komodo. Sistem ini dirancang untuk pelaporan kondisi kendaraan agar jauh lebih terstruktur, di mana penyimpanan database-nya memanfaatkan Google Spreadsheet untuk kemudahan akses dan manajemen data.',
                desc_en: 'Created an inspection reporting website for Komodo Airport. This system is designed for highly structured vehicle condition reporting, utilizing Google Spreadsheet as its database storage for easy access and data management.',
                img: '',
                link: 'https://aeroinspect360.netlify.app/',
                linkText: '<i class="fa-solid fa-globe"></i> Buka Web AeroInspect360',
                linkText_en: '<i class="fa-solid fa-globe"></i> Open AeroInspect360 Web'
            },
            'proj3': {
                title: 'UI/UX Aplikasi SEHATIN & LENTERA',
                title_en: 'UI/UX App SEHATIN & LENTERA',
                desc: `Melakukan perancangan tampilan visual (UI) dan pengalaman pengguna (UX) untuk aplikasi bernama SEHATIN dan LENTERA. Desain prototipe interaktif ini dibangun sepenuhnya menggunakan platform Figma.
                <br><br><b style="color:var(--text-primary);">Klik tautan di bawah ini untuk menguji Prototype secara langsung:</b>
                <div class="figma-btn-group">
                    <a href="https://www.figma.com/proto/XEmLQudfC14IOae8J8BBZo/Web?node-id=14-199&p=f&t=O5oQYg57Qs9wpEf3-0&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=14%3A199" target="_blank" class="figma-btn"><i class="fa-brands fa-figma"></i> Klik ini untuk melihat Prototype SEHATIN</a>
                    <a href="https://www.figma.com/design/PPKuZTv638qCGNpBg9755q/Lentera?node-id=0-1&t=tjIKjKUnqZRG1kvy-1" target="_blank" class="figma-btn"><i class="fa-brands fa-figma"></i> Klik ini untuk melihat Prototype LENTERA</a>
                </div>`,
                desc_en: `Designing the visual interface (UI) and user experience (UX) for applications named SEHATIN and LENTERA. This interactive prototype design was built entirely using the Figma platform.
                <br><br><b style="color:var(--text-primary);">Click the links below to test the Prototype directly:</b>
                <div class="figma-btn-group">
                    <a href="https://www.figma.com/proto/XEmLQudfC14IOae8J8BBZo/Web?node-id=14-199&p=f&t=O5oQYg57Qs9wpEf3-0&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=14%3A199" target="_blank" class="figma-btn"><i class="fa-brands fa-figma"></i> Click here to view SEHATIN Prototype</a>
                    <a href="https://www.figma.com/design/PPKuZTv638qCGNpBg9755q/Lentera?node-id=0-1&t=tjIKjKUnqZRG1kvy-1" target="_blank" class="figma-btn"><i class="fa-brands fa-figma"></i> Click here to view LENTERA Prototype</a>
                </div>`,
                img: 'images/mockup fix.png',
                link: '',
                linkText: ''
            },
            'proj4': {
                title: 'Repositori GitHub Pribadi',
                title_en: 'Personal GitHub Repository',
                desc: 'Kunjungi profil GitHub saya untuk melihat berbagai baris kode, eksplorasi mini proyek, dan dokumentasi repositori yang membuktikan perjalanan belajar serta kemampuan teknis saya secara faktual.',
                desc_en: 'Visit my GitHub profile to explore various lines of code, mini-projects, and repository documentation that factually prove my learning journey and technical abilities.',
                img: '',
                link: 'https://github.com/HaruHiro123',
                linkText: '<i class="fa-brands fa-github"></i> Kunjungi GitHub Saya',
                linkText_en: '<i class="fa-brands fa-github"></i> Visit My GitHub'
            },

            /* Data Sertifikasi & Event */
            'cert1': { 
                title: 'Belajar Dasar Data Science', 
                title_en: 'Learning Basic Data Science',
                desc: 'Diberikan oleh Dicoding Academy atas kelulusan pada kelas Belajar Dasar Data Science. Memvalidasi pemahaman terhadap konsep analisis data.', 
                desc_en: 'Awarded by Dicoding Academy upon graduation from the Learning Basic Data Science class. Validates the understanding of data analysis concepts.',
                img: 'images/sertifikat_course_615_4384993_041024220748_page-0001.jpg', 
                link: '' 
            },
            'cert2': { 
                title: 'IC3 Digital Literacy - GS6 Level 1', 
                title_en: 'IC3 Digital Literacy - GS6 Level 1', 
                desc: 'Membuktikan kompetensi dan pengetahuan terkait Technology Basics, Digital Citizenship, Information Management, Content Creation, Communication, Collaboration, serta Safety and Security dari penyelesaian kelulusan ujian literasi digital secara sukses.', 
                desc_en: 'Proves competence and knowledge related to Technology Basics, Digital Citizenship, Information Management, Content Creation, Communication, Collaboration, and Safety and Security from the successful completion of the digital literacy exam.',
                img: 'images/IC3 GS6 Level 1_page-0001.jpg', 
                link: '' 
            },
            'cert3': {
                title: 'DevFest Bali 2025 & Cloud Workshop',
                title_en: 'DevFest Bali 2025 & Cloud Workshop',
                desc: 'Momen keikutsertaan dalam ajang Google Developer Group (GDG) Bali serta sesi mendalami arsitektur infrastruktur self-hosting n8n di Google Cloud bersama komunitas teknologi dan praktisi profesional.',
                desc_en: 'Moments of participation in the Google Developer Group (GDG) Bali event and deep-dive sessions into the self-hosting n8n infrastructure architecture on Google Cloud with the tech community and professionals.',
                images: ['images/Gdev.jpeg', 'images/GIO1.jpeg', 'images/gIo.jpeg'],
                link: ''
            },

            /* Data Pameran Seni */
            'art1': { title: 'Portrait Sketch', desc: 'Eksplorasi goresan pensil grafit yang berfokus pada detail bayangan dan proporsi wajah.', desc_en: 'Exploration of graphite pencil strokes focusing on shadow details and facial proportions.', img: 'images/WhatsApp Image 2026-08-24 at 11.11.11 PM.jpeg', link: '' },
            'art2': { title: 'The Jester', desc: 'Sketsa bernuansa dark fantasy yang menampilkan karakter Jester dengan kontras pencahayaan yang dramatis.', desc_en:'A dark fantasy sketch featuring a Jester character with dramatic lighting contrast.', img: 'images/WhatsApp Image 2026-08-24 at 11.09.43 PM (2).jpeg', link: '' },
            'art3': { title: 'Smiley Portrait', desc: 'Pengerjaan pensil mendetail yang menangkap ekspresi senyum alami dan helaian rambut yang dinamis.', desc_en:'Detailed pencil work capturing a natural smile expression and dynamic hair strands.', img: 'images/WhatsApp Image 2026-08-24 at 11.09.43 PM (1).jpeg', link: '' },
            'art4': { title: 'Elf Concept', desc: 'Desain karakter konsep peri (Elf) yang menonjolkan estetika fantasi ringan dan detail dekoratif.', desc_en:'Elf concept character design highlighting light fantasy aesthetics and decorative details.', img: 'images/WhatsApp Image 2026-08-24 at 11.09.43 PM.jpeg', link: '' },
            'art5': { title: 'Modern Portrait', desc: 'Goresan pensil bergaya kontemporer yang menggabungkan anatomi wajah dengan elemen modern (headphone).', desc_en:'Contemporary style pencil strokes combining facial anatomy with modern elements (headphones).', img: 'images/WhatsApp Image 2026-08-24 at 11.09.44 PM.jpeg', link: '' },
            
            /* Data Pameran Organisasi */
            'exp_1': { title: 'Rapat Kerja HMJ TI', title_en:'HMJ TI Work Meeting', desc: 'Berpartisipasi aktif dalam merumuskan dan mengesahkan berbagai program kerja kepengurusan baru.', desc_en:'Actively participating in formulating and ratifying various new management work programs.', img: 'images/Mei5.jpeg', link: '' },
            'exp_2': { title: 'Pembukaan IT Camp', title_en:'IT Camp Opening', desc: 'Pemaparan visi orientasi luar ruangan yang difokuskan pada penguatan rasa kebersamaan mahasiswa baru.', desc_en:'Presentation of the outdoor orientation vision focused on strengthening the sense of togetherness of new students.', img: 'images/Mei.jpeg', link: '' },
            'exp_3': { title: 'Solidaritas Informatika', title_en:'Informatics Solidarity', desc: 'Kegiatan lapangan bersama seluruh panitia untuk mempererat kerja sama tim dan jiwa kepemimpinan.', desc_en:'Field activities with the entire committee to strengthen teamwork and leadership.', img: 'images/Mei1.jpeg', link: '' },
            'exp_4': { title: 'Penyuluhan IT Educare', title_en:'IT Educare Counseling', desc: 'Penyampaian edukasi literasi digital secara langsung kepada masyarakat dan siswa dalam program pengabdian.', desc_en:'Delivering digital literacy education directly to the community and students in community service programs.', img: 'images/Juli1.jpeg', link: '' },
            'exp_5': { title: 'Puncak IT Educare', title_en:'Peak of IT Educare', desc: 'Kolaborasi hebat dari seluruh kepanitiaan HMJ TI dalam menyukseskan acara edukasi tahunan.', desc_en:'Great collaboration from the entire HMJ TI committee in succeeding the annual educational event.', img: 'images/Juli4.jpeg', link: '' },
            'exp_6': { title: 'Studi Banding HIMAPRODI', title_en:'Comparative Study', desc: 'Bertukar wawasan dan program kerja inovatif bersama himpunan mahasiswa untuk memperluas perspektif organisasi.', desc_en:'Exchanging insights and innovative work programs with student associations to broaden organizational perspectives.', img: 'images/Juliiiiiii.jpeg', link: '' },
            'exp_7': { title: 'Sharing Session', title_en:'Sharing Session', desc: 'Sesi berbagi ilmu dan pengalaman yang membahas inovasi teknologi serta technopreneurship bersama mahasiswa.', desc_en:'Knowledge and experience sharing sessions discussing tech innovation and technopreneurship with students.', img: 'images/Oktober1.jpeg', link: '' },
            'exp_8': { title: 'INTEGER 2025', title_en:'INTEGER 2025', desc: 'Berpartisipasi dalam kepanitiaan INTEGER sebagai wadah eksplorasi dan kompetisi IT tingkat nasional.', desc_en:'Participating in the INTEGER committee as a platform for national level IT exploration and competition.', img: 'images/Integer Oktober.jpeg', link: '' },
            'exp_9': { title: 'Kegiatan Kreatif', title_en:'Creative Activities', desc: 'Mendukung kreativitas dan antusiasme mahasiswa dalam acara bertema budaya pop (Cosplay).', desc_en:'Supporting student creativity and enthusiasm in pop culture (Cosplay) themed events.', img: 'images/November.jpeg', link: '' },
            'exp_10': { title: 'Pameran Stand', title_en:'Booth Exhibition', desc: 'Mempromosikan program studi Ilmu Komputer dalam kegiatan pameran dan perkenalan kampus.', desc_en:'Promoting the Computer Science study program in campus exhibition and introduction activities.', img: 'images/November4.jpeg', link: '' },
            'exp_11': { title: 'Sinergi Organisasi', title_en:'Organizational Synergy', desc: 'Momen kebersamaan dan konsolidasi kepengurusan organisasi mahasiswa di lingkungan Fakultas.', desc_en:'Moments of togetherness and consolidation of student organization management within the Faculty.', img: 'images/November korma.jpeg', link: '' },
            'exp_12': { title: 'PEMIRA Serentak FTK', title_en:'FTK Joint Election', desc: 'Berpartisipasi dalam penyelenggaraan Pemilihan Raya (PEMIRA) serentak Fakultas Teknik dan Kejuruan.', desc_en:'Participating in the implementation of the simultaneous Faculty of Engineering and Vocational Election (PEMIRA).', img: 'images/Januari.jpeg', link: '' },
            'exp_13': { title: 'Solidaritas Pengurus', title_en:'Board Solidarity', desc: 'Dokumentasi kebersamaan dan koordinasi awal bersama anggota Himpunan Mahasiswa Jurusan Teknik Informatika.', desc_en:'Documentation of togetherness and initial coordination with members of the Informatics Engineering Student Association.', img: 'images/Februari.jpeg', link: '' },
            'exp_14': { title: 'Apresiasi Organisasi', title_en:'Organizational Appreciation', desc: 'Menerima penghargaan dan sertifikat sebagai bentuk apresiasi atas dedikasi serta pencapaian.', desc_en:'Receiving awards and certificates as a form of appreciation for dedication and achievements.', img: 'images/Maret2.jpeg', link: '' },
            'exp_15': { title: 'Kekompakan Panitia', title_en:'Committee Cohesion', desc: 'Momen kebersamaan dan sinergi tim panitia dalam mempersiapkan dan menyukseskan berbagai program kerja kampus.', desc_en:'Moments of togetherness and synergy of the committee team in preparing and succeeding various campus work programs.', img: 'images/Maret4.jpeg', link: '' },
            'exp_16': { title: 'Suksesi Camp', title_en:'Succession Camp', desc: 'Kegiatan pengembangan karakter dan regenerasi kepemimpinan melalui program Suksesi Camp di alam terbuka.', desc_en:'Character development activities and leadership regeneration through the outdoor Succession Camp program.', img: 'images/akhir maret.jpeg', link: '' }
        };


window.portfolioDetails = modalData;

// Samakan judul modal dengan nama karya yang tampil pada kartu asli.
modalData.art3.title = 'Waguri Smile';
modalData.art4.title = 'Frieren';
modalData.art5.title = 'Cosplay Art';

// Dokumentasi Gambar.zip: dikelompokkan menurut kegiatan, urutan cover tetap.
const experiencePhotos = {
  "exp_1": [
    "images/Mei5.jpeg",
    "images/Mei3.jpeg",
    "images/Mei 4.jpeg"
  ],
  "exp_2": [
    "images/Mei.jpeg"
  ],
  "exp_3": [
    "images/Mei1.jpeg"
  ],
  "exp_4": [
    "images/Juli1.jpeg",
    "images/Juli.jpeg"
  ],
  "exp_5": [
    "images/Juli4.jpeg",
    "images/Juli2.jpeg"
  ],
  "exp_6": [
    "images/Juliiiiiii.jpeg",
    "images/Juliiii.jpeg",
    "images/Julii.jpeg"
  ],
  "exp_7": [
    "images/Oktober1.jpeg",
    "images/Oktober2.jpeg"
  ],
  "exp_8": [
    "images/Integer Oktober.jpeg",
    "images/Oktober.jpeg"
  ],
  "exp_9": [
    "images/November.jpeg",
    "images/November2.jpeg",
    "images/November3.jpeg"
  ],
  "exp_10": [
    "images/November4.jpeg"
  ],
  "exp_11": [
    "images/November korma.jpeg"
  ],
  "exp_12": [
    "images/Januari.jpeg"
  ],
  "exp_13": [
    "images/Februari.jpeg"
  ],
  "exp_14": [
    "images/Maret2.jpeg",
    "images/MAret.jpeg"
  ],
  "exp_15": [
    "images/Maret4.jpeg"
  ],
  "exp_16": [
    "images/akhir maret.jpeg",
    "images/akhir maret suksesi camp.jpeg"
  ]
};
Object.entries(experiencePhotos).forEach(([id, images]) => {
  modalData[id].images = images;
  modalData[id].img = images[0];
});
