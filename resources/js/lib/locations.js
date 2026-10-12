/** Governorates and their main cities, keyed by stable ids stored as `governorate_id` / `city_id`. */
export const GOVERNORATES = [
    { id: 'cairo', name: 'القاهرة', cities: [['nasr_city', 'مدينة نصر'], ['heliopolis', 'مصر الجديدة'], ['maadi', 'المعادي'], ['new_cairo', 'القاهرة الجديدة'], ['downtown', 'وسط البلد'], ['shubra', 'شبرا']] },
    { id: 'giza', name: 'الجيزة', cities: [['dokki', 'الدقي'], ['mohandessin', 'المهندسين'], ['october', 'السادس من أكتوبر'], ['sheikh_zayed', 'الشيخ زايد'], ['haram', 'الهرم']] },
    { id: 'alexandria', name: 'الإسكندرية', cities: [['smouha', 'سموحة'], ['sidi_gaber', 'سيدي جابر'], ['miami', 'ميامي'], ['borg_alarab', 'برج العرب'], ['agami', 'العجمي']] },
    { id: 'qalyubia', name: 'القليوبية', cities: [['banha', 'بنها'], ['shubra_elkheima', 'شبرا الخيمة'], ['obour', 'العبور'], ['qalyub', 'قليوب']] },
    { id: 'dakahlia', name: 'الدقهلية', cities: [['mansoura', 'المنصورة'], ['talkha', 'طلخا'], ['mit_ghamr', 'ميت غمر']] },
    { id: 'sharqia', name: 'الشرقية', cities: [['zagazig', 'الزقازيق'], ['tenth_ramadan', 'العاشر من رمضان'], ['belbeis', 'بلبيس']] },
    { id: 'gharbia', name: 'الغربية', cities: [['tanta', 'طنطا'], ['mahalla', 'المحلة الكبرى'], ['kafr_elzayat', 'كفر الزيات']] },
    { id: 'monufia', name: 'المنوفية', cities: [['shebin', 'شبين الكوم'], ['sadat_city', 'مدينة السادات'], ['menouf', 'منوف']] },
    { id: 'beheira', name: 'البحيرة', cities: [['damanhour', 'دمنهور'], ['kafr_eldawar', 'كفر الدوار'], ['rashid', 'رشيد']] },
    { id: 'ismailia', name: 'الإسماعيلية', cities: [['ismailia_city', 'الإسماعيلية'], ['fayed', 'فايد'], ['qantara', 'القنطرة']] },
    { id: 'port_said', name: 'بورسعيد', cities: [['port_said_city', 'بورسعيد'], ['port_fouad', 'بورفؤاد']] },
    { id: 'suez', name: 'السويس', cities: [['suez_city', 'السويس'], ['ain_sokhna', 'العين السخنة']] },
    { id: 'faiyum', name: 'الفيوم', cities: [['faiyum_city', 'الفيوم'], ['sinnuris', 'سنورس']] },
    { id: 'minya', name: 'المنيا', cities: [['minya_city', 'المنيا'], ['mallawi', 'ملوي'], ['samalut', 'سمالوط']] },
    { id: 'asyut', name: 'أسيوط', cities: [['asyut_city', 'أسيوط'], ['dayrut', 'ديروط']] },
    { id: 'sohag', name: 'سوهاج', cities: [['sohag_city', 'سوهاج'], ['akhmim', 'أخميم'], ['girga', 'جرجا']] },
    { id: 'qena', name: 'قنا', cities: [['qena_city', 'قنا'], ['nag_hammadi', 'نجع حمادي']] },
    { id: 'luxor', name: 'الأقصر', cities: [['luxor_city', 'الأقصر'], ['esna', 'إسنا']] },
    { id: 'aswan', name: 'أسوان', cities: [['aswan_city', 'أسوان'], ['kom_ombo', 'كوم أمبو']] },
    { id: 'red_sea', name: 'البحر الأحمر', cities: [['hurghada', 'الغردقة'], ['safaga', 'سفاجا'], ['marsa_alam', 'مرسى علم']] },
    { id: 'south_sinai', name: 'جنوب سيناء', cities: [['sharm', 'شرم الشيخ'], ['dahab', 'دهب']] },
    { id: 'damietta', name: 'دمياط', cities: [['damietta_city', 'دمياط'], ['new_damietta', 'دمياط الجديدة'], ['ras_elbar', 'رأس البر']] },
    { id: 'kafr_elsheikh', name: 'كفر الشيخ', cities: [['kafr_elsheikh_city', 'كفر الشيخ'], ['desouk', 'دسوق']] },
    { id: 'beni_suef', name: 'بني سويف', cities: [['beni_suef_city', 'بني سويف'], ['el_wasta', 'الواسطى']] },
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
