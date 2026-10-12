import { t } from '@/i18n';

/** Governorates and their main cities, keyed by stable ids stored as `governorate_id` / `city_id`. */
export const GOVERNORATES = [
    { id: 'cairo', name: t('القاهرة'), cities: [['nasr_city', t('مدينة نصر')], ['heliopolis', t('مصر الجديدة')], ['maadi', t('المعادي')], ['new_cairo', t('القاهرة الجديدة')], ['downtown', t('وسط البلد')], ['shubra', t('شبرا')]] },
    { id: 'giza', name: t('الجيزة'), cities: [['dokki', t('الدقي')], ['mohandessin', t('المهندسين')], ['october', t('السادس من أكتوبر')], ['sheikh_zayed', t('الشيخ زايد')], ['haram', t('الهرم')]] },
    { id: 'alexandria', name: t('الإسكندرية'), cities: [['smouha', t('سموحة')], ['sidi_gaber', t('سيدي جابر')], ['miami', t('ميامي')], ['borg_alarab', t('برج العرب')], ['agami', t('العجمي')]] },
    { id: 'qalyubia', name: t('القليوبية'), cities: [['banha', t('بنها')], ['shubra_elkheima', t('شبرا الخيمة')], ['obour', t('العبور')], ['qalyub', t('قليوب')]] },
    { id: 'dakahlia', name: t('الدقهلية'), cities: [['mansoura', t('المنصورة')], ['talkha', t('طلخا')], ['mit_ghamr', t('ميت غمر')]] },
    { id: 'sharqia', name: t('الشرقية'), cities: [['zagazig', t('الزقازيق')], ['tenth_ramadan', t('العاشر من رمضان')], ['belbeis', t('بلبيس')]] },
    { id: 'gharbia', name: t('الغربية'), cities: [['tanta', t('طنطا')], ['mahalla', t('المحلة الكبرى')], ['kafr_elzayat', t('كفر الزيات')]] },
    { id: 'monufia', name: t('المنوفية'), cities: [['shebin', t('شبين الكوم')], ['sadat_city', t('مدينة السادات')], ['menouf', t('منوف')]] },
    { id: 'beheira', name: t('البحيرة'), cities: [['damanhour', t('دمنهور')], ['kafr_eldawar', t('كفر الدوار')], ['rashid', t('رشيد')]] },
    { id: 'ismailia', name: t('الإسماعيلية'), cities: [['ismailia_city', t('الإسماعيلية')], ['fayed', t('فايد')], ['qantara', t('القنطرة')]] },
    { id: 'port_said', name: t('بورسعيد'), cities: [['port_said_city', t('بورسعيد')], ['port_fouad', t('بورفؤاد')]] },
    { id: 'suez', name: t('السويس'), cities: [['suez_city', t('السويس')], ['ain_sokhna', t('العين السخنة')]] },
    { id: 'faiyum', name: t('الفيوم'), cities: [['faiyum_city', t('الفيوم')], ['sinnuris', t('سنورس')]] },
    { id: 'minya', name: t('المنيا'), cities: [['minya_city', t('المنيا')], ['mallawi', t('ملوي')], ['samalut', t('سمالوط')]] },
    { id: 'asyut', name: t('أسيوط'), cities: [['asyut_city', t('أسيوط')], ['dayrut', t('ديروط')]] },
    { id: 'sohag', name: t('سوهاج'), cities: [['sohag_city', t('سوهاج')], ['akhmim', t('أخميم')], ['girga', t('جرجا')]] },
    { id: 'qena', name: t('قنا'), cities: [['qena_city', t('قنا')], ['nag_hammadi', t('نجع حمادي')]] },
    { id: 'luxor', name: t('الأقصر'), cities: [['luxor_city', t('الأقصر')], ['esna', t('إسنا')]] },
    { id: 'aswan', name: t('أسوان'), cities: [['aswan_city', t('أسوان')], ['kom_ombo', t('كوم أمبو')]] },
    { id: 'red_sea', name: t('البحر الأحمر'), cities: [['hurghada', t('الغردقة')], ['safaga', t('سفاجا')], ['marsa_alam', t('مرسى علم')]] },
    { id: 'south_sinai', name: t('جنوب سيناء'), cities: [['sharm', t('شرم الشيخ')], ['dahab', t('دهب')]] },
    { id: 'damietta', name: t('دمياط'), cities: [['damietta_city', t('دمياط')], ['new_damietta', t('دمياط الجديدة')], ['ras_elbar', t('رأس البر')]] },
    { id: 'kafr_elsheikh', name: t('كفر الشيخ'), cities: [['kafr_elsheikh_city', t('كفر الشيخ')], ['desouk', t('دسوق')]] },
    { id: 'beni_suef', name: t('بني سويف'), cities: [['beni_suef_city', t('بني سويف')], ['el_wasta', t('الواسطى')]] },
].map((governorate) => ({
    ...governorate,
    cities: governorate.cities.map(([id, name]) => ({ id, name })),
}));

export function findGovernorate(governorateId) {
    return GOVERNORATES.find((governorate) => governorate.id === governorateId) ?? null;
}

export function findCity(governorateId, cityId) {
    return findGovernorate(governorateId)?.cities.find((city) => city.id === cityId) ?? null;
}
