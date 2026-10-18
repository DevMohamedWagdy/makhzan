import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, OptionCards, Select, Switch, Textarea } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useWarehouses } from '@/features/inventory/useWarehouses';
import { CategoryFormModal } from '@/features/products/CategoryFormModal';
import { ProductImagesField } from '@/features/products/ProductImagesField';
import { useCategories } from '@/features/products/useCategories';
import { VariantsEditor } from '@/features/products/VariantsEditor';
import { buildVariantsPayload, emptyVariantsState, isPerWarehouse, mapVariantServerErrors, validateVariants, variantsStateFromProduct } from '@/features/products/variants';
import { localized, t } from '@/i18n';
import { PRODUCT_STATUSES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import { productsApi } from '@/services/productsApi';

const STATUS_OPTIONS = Object.entries(PRODUCT_STATUSES).map(([value, config]) => ({
    value,
    label: config.label,
    description: config.description,
    icon: value === 'active' ? 'store' : value === 'draft' ? 'edit' : 'box',
}));

function detailsFromProduct(product) {
    return {
        name: product?.name ?? '',
        name_en: product?.name_en ?? '',
        description: product?.description ?? '',
        description_en: product?.description_en ?? '',
        category_id: product?.category?.category_id ? String(product.category.category_id) : '',
        status: product?.status ?? 'active',
        is_featured: product?.is_featured ?? false,
    };
}

/** Create (/dashboard/products/new) or edit (/dashboard/products/:productId) a product. */
export function ProductFormPage() {
    const { productId } = useParams();
    const isEdit = Boolean(productId);
    const navigate = useNavigate();
    const toast = useToast();
    const { can } = useAuth();
    const canSave = can(isEdit ? 'products.update' : 'products.create');
    const { categories, error: categoriesError, reload: reloadCategories } = useCategories();
    const [product, setProduct] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [details, setDetails] = useState(detailsFromProduct(null));
    const [variants, setVariants] = useState(emptyVariantsState);
    const [images, setImages] = useState([]);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { warehouses, error: warehousesError } = useWarehouses();

    // Saved variants the current options no longer include: saving deletes them with their stock.
    const removedVariants = useMemo(() => {
        if (!product) {
            return [];
        }

        const keptIds = buildVariantsPayload(variants, warehouses).variants.map((variant) => variant.id);

        return product.variants.filter((variant) => !keptIds.includes(variant.variant_id));
    }, [product, variants, warehouses]);

    useEffect(() => {
        if (!isEdit) {
            return;
        }

        productsApi
            .get(productId)
            .then((loaded) => {
                setProduct(loaded);
                setDetails(detailsFromProduct(loaded));
                setVariants(variantsStateFromProduct(loaded));
                setImages(loaded.images);
            })
            .catch((error) => setLoadError(error.message));
    }, [isEdit, productId]);

    // A new product goes into the only category when there is just one.
    useEffect(() => {
        if (!isEdit && categories?.length === 1) {
            setDetails((current) => (current.category_id ? current : { ...current, category_id: String(categories[0].category_id) }));
        }
    }, [isEdit, categories]);

    const setDetail = (field, value) => {
        setDetails((current) => ({ ...current, [field]: value }));
        setErrors(({ [field]: _removed, ...rest }) => rest);
    };

    const submit = async (event) => {
        event.preventDefault();

        const clientErrors = {
            ...(!details.name.trim() && { name: t('أدخل اسم المنتج') }),
            ...(!details.category_id && { category_id: t('اختر القسم') }),
            ...validateVariants(variants, warehouses),
        };

        setErrors(clientErrors);

        if (Object.keys(clientErrors).length) {
            toast.error(t('راجع بيانات المنتج'), t('بعض الحقول تحتاج إلى تصحيح.'));

            return;
        }

        const { options, variants: variantRows, keys } = buildVariantsPayload(variants, warehouses);
        const payload = { ...details, name: details.name.trim(), name_en: details.name_en.trim() || null, description: details.description.trim() || null, description_en: details.description_en.trim() || null, category_id: Number(details.category_id), options, variants: variantRows };

        setSaving(true);

        try {
            if (isEdit) {
                const saved = await productsApi.update(productId, payload);

                setProduct(saved);
                setVariants(variantsStateFromProduct(saved));
                toast.success(t('تم حفظ المنتج'), localized(saved));
            } else {
                const saved = await productsApi.create(payload);

                const imagesUploaded = pendingFiles.length === 0 || (await productsApi.uploadImages(saved.product_id, pendingFiles).then(
                    () => true,
                    (error) => (toast.error(t('تم حفظ المنتج لكن تعذر رفع الصور'), t('أضف الصور مرة أخرى من صفحة تعديل المنتج.') + ' ' + error.message), false),
                ));

                if (imagesUploaded) {
                    toast.success(t('تمت إضافة المنتج'), localized(saved));
                }

                // When the photos failed, open the saved product so they can be added again right away.
                navigate(imagesUploaded ? '/dashboard/products' : `/dashboard/products/${saved.product_id}`);
            }
        } catch (error) {
            setErrors(mapVariantServerErrors(error.errors ?? {}, keys, isPerWarehouse(warehouses)));
            toast.error(t('تعذر حفظ المنتج'), Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setDeleting(true);

        try {
            await productsApi.remove(productId);
            toast.success(t('تم حذف المنتج'), localized(product));
            navigate('/dashboard/products');
        } catch (error) {
            toast.error(t('تعذر حذف المنتج'), error.message);
            setDeleting(false);
        }
    };

    const title = isEdit ? (localized(product) || t('تعديل المنتج')) : t('إضافة منتج');
    const header = <PageHeader title={title} breadcrumbs={[t('لوحة التحكم'), t('المنتجات'), isEdit ? t('تعديل') : t('منتج جديد')]} />;

    if (loadError) {
        return (
            <>
                {header}
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل المنتج')} description={loadError} action={<Button variant="secondary" to="/dashboard/products">{t('العودة للمنتجات')}</Button>} />
            </>
        );
    }

    if (categoriesError) {
        return (
            <>
                {header}
                <EmptyState icon="alert-triangle" title={t('تعذر تحميل الأقسام')} description={categoriesError} action={<Button variant="secondary" icon="refresh" onClick={reloadCategories}>{t('إعادة المحاولة')}</Button>} />
            </>
        );
    }

    // Wait for the warehouses too: with several, quantities are entered per warehouse.
    if (categories === null || (warehouses === null && !warehousesError) || (isEdit && !product)) {
        return (
            <>
                {header}
                <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                    <Skeleton className="h-96 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            </>
        );
    }

    if (categories.length === 0) {
        return (
            <>
                {header}
                <EmptyState
                    icon="grid"
                    title={t('أضف قسماً أولاً')}
                    description={t('كل منتج يجب أن يتبع قسماً. أضف القسم الذي ينتمي له هذا المنتج، ثم أكمل إضافته.')}
                    action={
                        <Button icon="plus" onClick={() => setCategoryModalOpen(true)}>
                            {t('إضافة قسم')}
                        </Button>
                    }
                />
                <CategoryFormModal
                    open={categoryModalOpen}
                    onClose={() => setCategoryModalOpen(false)}
                    onSaved={async (category) => {
                        setCategoryModalOpen(false);
                        await reloadCategories();
                        setDetail('category_id', String(category.category_id));
                    }}
                />
            </>
        );
    }

    return (
        <>
            <form onSubmit={submit} noValidate>
                <PageHeader
                    title={title}
                    breadcrumbs={[t('لوحة التحكم'), t('المنتجات'), isEdit ? t('تعديل') : t('منتج جديد')]}
                    actions={
                        <>
                            <Button variant="secondary" to="/dashboard/products" disabled={saving}>
                                {t('إلغاء')}
                            </Button>
                            {canSave && (
                                <Button type="submit" icon="check" loading={saving}>
                                    {isEdit ? t('حفظ التعديلات') : t('حفظ المنتج')}
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <Card title={t('بيانات المنتج')}>
                            <div className="flex flex-col gap-5">
                                <Field label={t('اسم المنتج')} required error={errors.name}>
                                    {(props) => <Input {...props} data-autofocus value={details.name} onChange={(event) => setDetail('name', event.target.value)} aria-invalid={errors.name ? 'true' : undefined} placeholder={t('مثال: فستان سهرة ستان')} maxLength={150} />}
                                </Field>
                                <Field label={t('الاسم بالإنجليزية')} optional error={errors.name_en} hint={t('يظهر بدلاً من الاسم عند استخدام المتجر أو لوحة التحكم بالإنجليزية.')}>
                                    {(props) => <Input {...props} value={details.name_en} onChange={(event) => setDetail('name_en', event.target.value)} dir="ltr" placeholder="Satin evening dress" maxLength={150} />}
                                </Field>
                                <Field label={t('الوصف')} optional error={errors.description} hint={t('الخامة، المقاسات، طريقة العناية... يظهر في صفحة المنتج بالمتجر')}>
                                    {(props) => <Textarea {...props} value={details.description} onChange={(event) => setDetail('description', event.target.value)} className="min-h-32" maxLength={5000} />}
                                </Field>
                                <Field label={t('الوصف بالإنجليزية')} optional error={errors.description_en}>
                                    {(props) => <Textarea {...props} value={details.description_en} onChange={(event) => setDetail('description_en', event.target.value)} dir="ltr" className="min-h-32" maxLength={5000} />}
                                </Field>
                            </div>
                        </Card>

                        <Card title={t('الصور')} description={isEdit ? t('التغييرات على الصور تُحفظ مباشرة') : t('تُرفع الصور بعد حفظ المنتج')}>
                            <ProductImagesField productId={isEdit ? productId : null} images={images} onImagesChange={setImages} pendingFiles={pendingFiles} onPendingChange={setPendingFiles} />
                        </Card>

                        <Card title={t('السعر والمخزون')}>
                            {removedVariants.length > 0 && (
                                <Alert tone="warning" icon="alert-triangle" title={t('سيتم حذف {count} من التركيبات المحفوظة عند الحفظ', { count: formatNumber(removedVariants.length) })} className="mb-5">
                                    {removedVariants.map((variant) => variant.title || t('المنتج')).join('، ')}
                                    {' · '}
                                    {t('مخزونها الحالي ({count} قطعة) سيُسجَّل كخصم في حركة المخزون.', { count: formatNumber(removedVariants.reduce((total, variant) => total + variant.stock, 0)) })}
                                </Alert>
                            )}
                            <VariantsEditor value={variants} onChange={setVariants} errors={errors} warehouses={warehouses} />
                        </Card>

                        {isEdit && can('products.delete') && (
                            <Alert tone="danger" icon="trash" title={t('حذف المنتج')}>
                                <p>{t('سيختفي المنتج من لوحة التحكم والمتجر.')}</p>
                                <Button variant="danger-soft" size="sm" icon="trash" className="mt-3" onClick={() => setDeleteOpen(true)}>
                                    {t('حذف المنتج')}
                                </Button>
                            </Alert>
                        )}
                    </div>

                    {/* Category and status come first on narrower screens: the category is required. */}
                    <div className="order-first grid gap-6 md:grid-cols-2 xl:sticky xl:top-24 xl:order-last xl:flex xl:flex-col">
                        <Card title={t('القسم')}>
                            <Field label={t('قسم المنتج')} required error={errors.category_id}>
                                {(props) => (
                                    <Select
                                        {...props}
                                        value={details.category_id}
                                        onChange={(event) => setDetail('category_id', event.target.value)}
                                        placeholder={t('اختر القسم')}
                                        options={categories.map((category) => ({ value: String(category.category_id), label: localized(category) }))}
                                        aria-invalid={errors.category_id ? 'true' : undefined}
                                    />
                                )}
                            </Field>
                            <button type="button" onClick={() => setCategoryModalOpen(true)} className="mt-2 text-xs font-medium text-primary hover:underline">
                                {t('+ قسم جديد')}
                            </button>
                        </Card>

                        <Card title={t('حالة المنتج')}>
                            <OptionCards columns={1} value={details.status} onChange={(status) => setDetail('status', status)} options={STATUS_OPTIONS} />
                            <div className="mt-4 border-t border-line pt-4">
                                <Switch checked={details.is_featured} onChange={(value) => setDetail('is_featured', value)} label={t('منتج مميز')} description={t('يظهر في الصفحة الرئيسية للمتجر')} />
                            </div>
                        </Card>

                    </div>
                </div>
            </form>

            <CategoryFormModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                onSaved={async (category) => {
                    setCategoryModalOpen(false);
                    toast.success(t('تمت إضافة القسم'), localized(category));
                    await reloadCategories();
                    setDetail('category_id', String(category.category_id));
                }}
            />

            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={remove}
                loading={deleting}
                icon="trash"
                title={t('حذف «{value}»؟', { value: localized(product) })}
                description={t('لإيقاف بيعه مؤقتاً اختر «مؤرشف» من حالة المنتج بدلاً من الحذف.')}
                confirmLabel={t('حذف المنتج')}
            />
        </>
    );
}
