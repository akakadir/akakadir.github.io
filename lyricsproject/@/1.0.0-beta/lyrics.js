// lyrics.js made by kadir for cyka.ml

var words = [

'basaramam, sensiz yasayamam', 
'zaten benimle hep yabancıydın', 
'gerek yok artık aglamana', 
'gece boyu dusunup yine uyuyamamak', 
'teşekkür ederim her şey için', 
'essitalopram, zihnim çok bitkin', 
'bitti mi hikayemiz?', 
'kimin için varsın senin için varken ben', 
'eros okların yerinde kalsın', 
'incelince kopmadık ki biz bi anda parçalandık', 
'bir olmayı becerdik biz olmayı beceremedik', 
'bok var gibi yüreğime düştün', 
'bir defa daha yazsa bebeğim, bebeğim, bebeğim',
'özledim seni harbiden', 
'belki de seni hala deli gibi seviyorumdur', 
'öylece sevdiğim kadının, gidişini izledim', 
'kediler ve sarkilar bize yeterli degil', 
'artık daha az seviyorum seni, unutuyor gibi, ölüyor gibi', 
'mutlu ol olduğun yerde eğlen kendince', 
'mutluyum, inan. anladım bir şanstı bu', 
'benimdin eskiden, evimdin eskiden', 
'benim herkesi, o da benim herkesim', 
'anladım ki herkes gibi bir gün gidersin', 
'bu yol karanlık ve korktun biraz', 
'ben nasıl bir adamım hiç sevilmemişim', 
'gönül ister her gece seni', 
'sev sen sevgili ekseninde sersefilim ben senin', 
'yalnızken ve sana uzakta öyle soğuk, anlamsız ki her şey', 
'alışabilirim kaybolmana vazgeçişin canımı yaksa da', 
'içindeki ben hiç ölmesin', 
'yine geldim sokağına, gece boyu yürümüşüm', 
'yarıda bırakacak mecalim yok', 
'kimsin? nası geldin? beni buldun, geri gitme', 
'yağmuru olacakken bulutun sen', 
'gecenin köründe düşüyorsun aklıma birden', 
'daha fazla kendini kandırmak yok', 
'tükendiğimde ise izmarit gibi savurdun', 
'yine de sarılırdım, belki sıkılırdım', 
'sigarayı da seni de bırakırdım güya', 
'tebrik ederim beni pes ettirdin',

];

var bg = words[Math.floor(Math.random()*words.length)];
$('.lyrics').html(bg);