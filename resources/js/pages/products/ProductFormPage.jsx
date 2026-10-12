import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Card, EmptyState } from '@/components/ui/Display';
import { Field, Input, OptionCards, Select, Switch, Textarea } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { CategoryFormModal } from '@/features/products/CategoryFormModal';
import { ProductImagesField } from '@/features/products/ProductImagesField';
import { useCategories } from '@/features/products/useCategories';
import { VariantsEditor } from '@/features/products/VariantsEditor';
import { buildVariantsPayload, emptyVariantsState, mapVariantServerErrors, validateVariants, variantsStateFromProduct } from '@/features/products/variants';
import { PRODUCT_STATUSES } from '@/lib/constants';
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
        description: product?.description ?? '',
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
    const { categories, reload: reloadCategories } = useCategories();
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
            ...(!details.name.trim() && { name: 'أدخل اسم المنتج' }),
            ...(!details.category_id && { category_id: 'اختر القسم' }),
            ...validateVariants(variants),
        };

        setErrors(clientErrors);

        if (Object.keys(clientErrors).length) {
            toast.error('راجع بيانات المنتج', 'بعض الحقول تحتاج إلى تصحيح.');

            return;
        }

        const { options, variants: variantRows, keys } = buildVariantsPayload(variants);
        const payload = { ...details, name: details.name.trim(), description: details.description.trim() || null, category_id: Number(details.category_id), options, variants: variantRows };

        setSaving(true);

        try {
            if (isEdit) {
                const saved = await productsApi.update(productId, payload);

                setProduct(saved);
                setVariants(variantsStateFromProduct(saved));
                toast.success('تم حفظ المنتج', saved.name);
            } else {
                const saved = await productsApi.create(payload);

                if (pendingFiles.length) {
                    await productsApi.uploadImages(saved.product_id, pendingFiles).catch((error) => toast.error('تم حفظ المنتج لكن تعذر رفع الصور', error.message));
                }

                toast.success('تمت إضافة المنتج', saved.name);
                navigate('/dashboard/products');
            }
        } catch (error) {
            setErrors(mapVariantServerErrors(error.errors ?? {}, keys));
            toast.error('تعذر حفظ المنتج', Object.values(error.errors ?? {})[0] ?? error.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setDeleting(true);

        try {
            await productsApi.remove(productId);
            toast.success('تم حذف المنتج', product.name);
            navigate('/dashboard/products');
        } catch (error) {
            toast.error('تعذر حذف المنتج', error.message);
            setDeleting(false);
        }
    };

    const title = isEdit ? (product?.name ?? 'تعديل المنتج') : 'إضافة منتج';
    const header = <PageHeader title={title} breadcrumbs={['لوحة التحكم', 'المنتجات', isEdit ? 'تعديل' : 'منتج جديد']} />;

    if (loadError) {
        return (
            <>
                {header}
                <EmptyState icon="alert-triangle" title="تعذر تحميل المنتج" description={loadError} action={<Button variant="secondary" to="/dashboard/products">العودة للمنتجات</Button>} />
            </>
        );
    }

    if (categories === null || (isEdit && !product)) {
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
                    title="أضف قسماً أولاً"
                    description="كل منتج يجب أن يتبع قسماً. أضف القسم الذي ينتمي له هذا المنتج، ثم أكمل إضافته."
                    action={
                        <Button icon="plus" onClick={() => setCategoryModalOpen(true)}>
                            إضافة قسم
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
                    breadcrumbs={['لوحة التحكم', 'المنتجات', isEdit ? 'تعديل' : 'منتج جديد']}
                    actions={
                        <>
                            <Button variant="secondary" to="/dashboard/products" disabled={saving}>
                                إلغاء
                            </Button>
                            <Button type="submit" icon="check" loading={saving}>
                                {isEdit ? 'حفظ التعديلات' : 'حفظ المنتج'}
                            </Button>
                        </>
                    }
                />

                <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <Card title="بيانات المنتج">
                            <div className="flex flex-col gap-5">
                                <Field label="اسم المنتج" required error={errors.name}>
                                    {(props) => <Input {...props} data-autofocus value={details.name} onChange={(event) => setDetail('name', event.target.value)} aria-invalid={errors.name ? 'true' : undefined} placeholder="مثال: فستان سهرة ستان" maxLength={150} />}
                                </Field>
                                <Field label="الوصف" optional error={errors.description} hint="الخامة، المقاسات، طريقة العناية... يظهر في صفحة المنتج بالمتجر">
                                    {(props) => <Textarea {...props} value={details.description} onChange={(event) => setDetail('description', event.target.value)} className="min-h-32" maxLength={5000} />}
                                </Field>
                            </div>
                        </Card>

                        <Card title="الصور" description={isEdit ? 'التغييرات على الصور تُحفظ مباشرة' : 'تُرفع الصور بعد حفظ المنتج'}>
                            <ProductImagesField productId={isEdit ? productId : null} images={images} onImagesChange={setImages} pendingFiles={pendingFiles} onPendingChange={setPendingFiles} />
                        </Card>

                        <Card title="السعر والمخزون">
                            <VariantsEditor value={variants} onChange={setVariants} errors={errors} />
                        </Card>

                        {isEdit && (
                            <Alert tone="danger" icon="trash" title="حذف المنتج">
                                <p>سيختفي المنتج من لوحة التحكم والمتجر.</p>
                                <Button variant="danger-soft" size="sm" icon="trash" className="mt-3" onClick={() => setDeleteOpen(true)}>
                                    حذف المنتج
                                </Button>
                            </Alert>
                        )}
                    </div>

                    {/* Category and status come first on narrower screens: the category is required. */}
                    <div className="order-first grid gap-6 md:grid-cols-2 xl:sticky xl:top-24 xl:order-last xl:flex xl:flex-col">
                        <Card title="القسم">
                            <Field label="قسم المنتج" required error={errors.category_id}>
                                {(props) => (
                                    <Select
                                        {...props}
                                        value={details.category_id}
                                        onChange={(event) => setDetail('category_id', event.target.value)}
                                        placeholder="اختر القسم"
                                        options={categories.map((category) => ({ value: String(category.category_id), label: category.name }))}
                                        aria-invalid={errors.category_id ? 'true' : undefined}
                                    />
                                )}
                            </Field>
                            <button type="button" onClick={() => setCategoryModalOpen(true)} className="mt-2 text-xs font-medium text-primary hover:underline">
                                + قسم جديد
                            </button>
                        </Card>

                        <Card title="حالة المنتج">
                            <OptionCards columns={1} value={details.status} onChange={(status) => setDetail('status', status)} options={STATUS_OPTIONS} />
                            <div className="mt-4 border-t border-line pt-4">
                                <Switch checked={details.is_featured} onChange={(value) => setDetail('is_featured', value)} label="منتج مميز" description="يظهر في الصفحة الرئيسية للمتجر" />
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
                    toast.success('تمت إضافة القسم', category.name);
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
                title={`حذف «${product?.name ?? ''}»؟`}
                description="لإيقاف بيعه مؤقتاً اختر «مؤرشف» من حالة المنتج بدلاً من الحذف."
                confirmLabel="حذف المنتج"
            />
        </>
    );
}
