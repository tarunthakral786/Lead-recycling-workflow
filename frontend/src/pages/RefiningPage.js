import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ArrowLeft, Plus, X, Check, ChevronRight, Image, Calendar, Package } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RefiningPage({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  
  // Entry date for past-dated entries
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Available RML SKUs
  const [rmlSkus, setRmlSkus] = useState([]);
  
  useEffect(() => {
    fetchRmlSkus();
  }, []);
  
  const fetchRmlSkus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/rml-purchases/skus`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRmlSkus(response.data);
    } catch (error) {
      console.error('Failed to load RML SKUs');
    }
  };
  
  // Each batch tracks its own saved state per step
  const [batches, setBatches] = useState([{
    input_source: 'manual', // 'manual', 'SANTOSH', or RML SKU name
    sb_percentage: '', // Required when SANTOSH is selected
    lead_ingot_kg: '',
    lead_ingot_pieces: '',
    lead_ingot_images: [], // Multiple images support
    initial_dross_kg: '',
    initial_dross_images: [],
    cu_dross_kg: '',
    cu_dross_images: [],
    sn_dross_kg: '',
    sn_dross_images: [],
    sb_dross_kg: '',
    sb_dross_images: [],
    dross_remarks: '', // Optional remarks for dross
    pure_lead_kg: '',
    pure_lead_pieces: '', // Added pieces for pure lead
    pure_lead_images: [],
    step1_saved: false,
    step2_saved: false,
    step3_saved: false
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
      input_source: 'manual',
      sb_percentage: '',
      lead_ingot_kg: '',
      lead_ingot_pieces: '',
      lead_ingot_images: [],
      initial_dross_kg: '',
      initial_dross_images: [],
      cu_dross_kg: '',
      cu_dross_images: [],
      sn_dross_kg: '',
      sn_dross_images: [],
      sb_dross_kg: '',
      sb_dross_images: [],
      dross_remarks: '',
      pure_lead_kg: '',
      pure_lead_pieces: '',
      pure_lead_images: [],
      step1_saved: false,
      step2_saved: false,
      step3_saved: false
    }]);
    setImagePreviews([...imagePreviews, {}]);
    setCurrentBatchIndex(batches.length);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      const newBatches = batches.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter((_, i) => i !== index);
      setBatches(newBatches);
      setImagePreviews(newPreviews);
      if (currentBatchIndex >= newBatches.length) {
        setCurrentBatchIndex(newBatches.length - 1);
      }
    }
  };

  // Handle multiple files for a field
  const handleMultipleFileChange = async (batchIndex, field, files) => {
    if (!files || files.length === 0) return;
    
    const compressedFiles = [];
    const previewUrls = [];
    
    for (const file of Array.from(files)) {
      const compressedFile = await compressImage(file);
      compressedFiles.push(compressedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        previewUrls.push(reader.result);
        if (previewUrls.length === files.length) {
          const newPreviews = [...imagePreviews];
          newPreviews[batchIndex] = { 
            ...newPreviews[batchIndex], 
            [field]: [...(newPreviews[batchIndex]?.[field] || []), ...previewUrls]
          };
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(compressedFile);
    }
    
    const newBatches = [...batches];
    newBatches[batchIndex][field] = [...(newBatches[batchIndex][field] || []), ...compressedFiles];
    setBatches(newBatches);
  };

  // Remove a specific image from array
  const removeImage = (batchIndex, field, imageIndex) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = newBatches[batchIndex][field].filter((_, i) => i !== imageIndex);
    setBatches(newBatches);
    
    const newPreviews = [...imagePreviews];
    if (newPreviews[batchIndex]?.[field]) {
      newPreviews[batchIndex][field] = newPreviews[batchIndex][field].filter((_, i) => i !== imageIndex);
      setImagePreviews(newPreviews);
    }
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    // Reset SB percentage when input source changes
    if (field === 'input_source' && value !== 'SANTOSH') {
      newBatches[batchIndex].sb_percentage = '';
    }
    setBatches(newBatches);
  };

  // Check if current step can be saved
  const canSaveCurrentStep = (batchIndex) => {
    const batch = batches[batchIndex];
    if (step === 1) {
      // If SANTOSH is selected, SB percentage is required
      if (batch.input_source === 'SANTOSH' && !batch.sb_percentage) {
        return false;
      }
      return batch.lead_ingot_kg && batch.lead_ingot_pieces && batch.lead_ingot_images.length > 0;
    } else if (step === 2) {
      return batch.initial_dross_kg && batch.initial_dross_images.length > 0 && 
             batch.dross_2nd_kg && batch.dross_2nd_images.length > 0 && 
             batch.dross_3rd_kg && batch.dross_3rd_images.length > 0;
    } else if (step === 3) {
      return batch.pure_lead_kg && batch.pure_lead_pieces && batch.pure_lead_images.length > 0;
    }
    return false;
  };

  // Save current step for a batch
  const saveBatchStep = (batchIndex) => {
    const newBatches = [...batches];
    if (step === 1) {
      newBatches[batchIndex].step1_saved = true;
    } else if (step === 2) {
      newBatches[batchIndex].step2_saved = true;
    } else if (step === 3) {
      newBatches[batchIndex].step3_saved = true;
    }
    setBatches(newBatches);
    toast.success(`Batch ${batchIndex + 1} - Step ${step} saved!`);
  };

  // Check if all batches have current step saved
  const allBatchesSavedForCurrentStep = () => {
    if (step === 1) {
      return batches.every(batch => batch.step1_saved);
    } else if (step === 2) {
      return batches.every(batch => batch.step2_saved);
    } else if (step === 3) {
      return batches.every(batch => batch.step3_saved);
    }
    return false;
  };

  // Check if batch step is saved
  const isBatchStepSaved = (batchIndex) => {
    const batch = batches[batchIndex];
    if (step === 1) return batch.step1_saved;
    if (step === 2) return batch.step2_saved;
    if (step === 3) return batch.step3_saved;
    return false;
  };

  // Final submit - save to database
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const form = new FormData();
      
      const batchesData = batches.map(batch => {
        // Determine SB percentage based on input source
        let sbPercentage = null;
        if (batch.input_source === 'SANTOSH') {
          sbPercentage = parseFloat(batch.sb_percentage);
        } else if (batch.input_source !== 'manual') {
          // RML SKU selected - get SB% from the SKU
          const selectedSku = rmlSkus.find(sku => sku.sku === batch.input_source);
          if (selectedSku) {
            sbPercentage = selectedSku.sb_percentage;
          }
        }
        
        return {
          input_source: batch.input_source || 'manual',
          sb_percentage: sbPercentage,
          lead_ingot_kg: parseFloat(batch.lead_ingot_kg),
          lead_ingot_pieces: parseInt(batch.lead_ingot_pieces),
          initial_dross_kg: parseFloat(batch.initial_dross_kg),
          dross_2nd_kg: parseFloat(batch.dross_2nd_kg),
          dross_3rd_kg: parseFloat(batch.dross_3rd_kg),
          dross_remarks: batch.dross_remarks || '',
          pure_lead_kg: parseFloat(batch.pure_lead_kg),
          pure_lead_pieces: parseInt(batch.pure_lead_pieces),
          // Include image counts for backend processing
          lead_ingot_image_count: batch.lead_ingot_images.length,
          initial_dross_image_count: batch.initial_dross_images.length,
          dross_2nd_image_count: batch.dross_2nd_images.length,
          dross_3rd_image_count: batch.dross_3rd_images.length,
          pure_lead_image_count: batch.pure_lead_images.length
        };
      });
      
      form.append('batches_data', JSON.stringify(batchesData));
      form.append('entry_date', entryDate); // Send the selected date
      
      // Append all images in order - first image of each field for backward compatibility
      batches.forEach(batch => {
        // Send first image of each type (for backward compatibility)
        if (batch.lead_ingot_images[0]) form.append('files', batch.lead_ingot_images[0]);
        if (batch.initial_dross_images[0]) form.append('files', batch.initial_dross_images[0]);
        if (batch.dross_2nd_images[0]) form.append('files', batch.dross_2nd_images[0]);
        if (batch.dross_3rd_images[0]) form.append('files', batch.dross_3rd_images[0]);
        if (batch.pure_lead_images[0]) form.append('files', batch.pure_lead_images[0]);
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/refining/entries`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${batches.length} batch(es) submitted successfully!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  // Render multiple image upload
  const renderMultiImageUpload = (batchIndex, field, label) => {
    const images = imagePreviews[batchIndex]?.[field] || [];
    const isDisabled = isBatchStepSaved(batchIndex);
    
    return (
      <div>
        <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
          {label}
        </Label>
        
        {/* Existing images */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img, imgIdx) => (
              <div key={imgIdx} className="relative">
                <img src={img} alt={`Preview ${imgIdx + 1}`} className="h-24 w-full object-cover rounded-lg border-2 border-slate-200" />
                {!isDisabled && (
                  <button
                    onClick={() => removeImage(batchIndex, field, imgIdx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Add more images */}
        {!isDisabled && (
          <label
            htmlFor={`${field}-${batchIndex}`}
            className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer h-32 flex flex-col items-center justify-center gap-2"
            data-testid={`${field}-upload-zone-${batchIndex}`}
          >
            <div className="flex items-center gap-2">
              <Camera className="w-8 h-8 text-slate-400" />
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <span className="text-base font-semibold text-slate-500">
              {images.length > 0 ? 'Add more photos' : 'Tap to capture photos'}
            </span>
            <span className="text-xs text-slate-400">Multiple images allowed</span>
          </label>
        )}
        
        <input
          id={`${field}-${batchIndex}`}
          data-testid={`${field}-input-${batchIndex}`}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleMultipleFileChange(batchIndex, field, e.target.files)}
          className="hidden"
          disabled={isDisabled}
        />
        
        {images.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">{images.length} photo(s) added</p>
        )}
      </div>
    );
  };

  const renderBatchTabs = () => (
    <div className="flex gap-2 mb-6 flex-wrap">
      {batches.map((batch, idx) => (
        <Button
          key={idx}
          onClick={() => setCurrentBatchIndex(idx)}
          data-testid={`batch-tab-${idx}`}
          className={`h-12 px-4 font-bold rounded-lg flex items-center gap-2 ${
            currentBatchIndex === idx
              ? 'bg-orange-600 text-white'
              : isBatchStepSaved(idx)
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          Batch {idx + 1}
          {isBatchStepSaved(idx) && <Check className="w-4 h-4" />}
        </Button>
      ))}
      {/* Only show Add Batch button in Step 1 */}
      {step === 1 && (
        <Button
          onClick={addBatch}
          data-testid="add-batch-button"
          className="h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
        >
          <Plus className="w-5 h-5 mr-1" />
          Add Batch
        </Button>
      )}
    </div>
  );

  const batch = batches[currentBatchIndex];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="h-12 px-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900" data-testid="refining-title">Refining Process</h1>
              <p className="text-base text-slate-600">{batches.length} batch(es) | Step {step} of 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Date Picker Card */}
        <Card className="bg-orange-50 border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <Label className="text-sm font-bold text-orange-700 uppercase">Entry Date</Label>
            </div>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 text-lg px-4 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-300 focus:border-orange-400 bg-white"
              data-testid="entry-date-input"
            />
            <p className="text-sm text-orange-600">Select date for this entry (can be past date)</p>
          </div>
        </Card>

        {/* Step Indicator */}
        <div className="flex justify-center gap-4 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                step === s ? 'bg-orange-600 text-white' : step > s ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}
              data-testid={`step-indicator-${s}`}
            >
              {step > s ? <Check className="w-8 h-8" /> : s}
            </div>
          ))}
        </div>

        <div className="text-center mb-6">
          <p className="text-lg text-slate-600">
            {step === 1 && 'Enter Lead Ingot details for each batch, save, then proceed'}
            {step === 2 && 'Enter Dross details for each batch, save, then proceed'}
            {step === 3 && 'Enter Pure Lead output for each batch, save, then submit'}
          </p>
        </div>

        {/* Batch Tabs */}
        {renderBatchTabs()}

        {/* Current Batch Form */}
        <Card className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-slate-900">Batch {currentBatchIndex + 1}</h3>
              {isBatchStepSaved(currentBatchIndex) && (
                <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-bold rounded-full flex items-center gap-1">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
            {batches.length > 1 && (
              <Button
                onClick={() => removeBatch(currentBatchIndex)}
                data-testid={`remove-batch-${currentBatchIndex}`}
                className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Lead Ingot Input</h2>
              
              {/* RML SKU Selection */}
              <Card className="bg-purple-50 border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-purple-600" />
                  <Label className="text-sm font-bold text-purple-700 uppercase">Input Source</Label>
                </div>
                <Select
                  value={batch.input_source}
                  onValueChange={(value) => handleInputChange(currentBatchIndex, 'input_source', value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                >
                  <SelectTrigger className="h-14 text-lg px-4 w-full border-2 border-purple-200 rounded-lg bg-white">
                    <SelectValue placeholder="Select input source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="text-lg">Manual Entry (New Lead Ingot)</SelectItem>
                    <SelectItem value="SANTOSH" className="text-lg font-bold text-green-700">SANTOSH (From Recycling Receivable)</SelectItem>
                    {rmlSkus.map(sku => (
                      <SelectItem key={sku.sku} value={sku.sku} className="text-lg">
                        {sku.sku} - {sku.total_quantity_kg} kg available ({sku.total_pieces} pcs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {batch.input_source === 'SANTOSH' && (
                  <p className="text-sm text-green-600 mt-2">This quantity will be deducted from Remelted Lead Receivable</p>
                )}
                {batch.input_source !== 'manual' && batch.input_source !== 'SANTOSH' && (
                  <p className="text-sm text-purple-600 mt-2">Using RML purchased stock as input</p>
                )}
              </Card>
              
              {/* SB Percentage - Required for SANTOSH */}
              {batch.input_source === 'SANTOSH' && (
                <Card className="bg-green-50 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-sm font-bold text-green-700 uppercase">SB Percentage (Required)</Label>
                  </div>
                  <Input
                    data-testid={`sb-percentage-input-${currentBatchIndex}`}
                    type="number"
                    step="0.01"
                    value={batch.sb_percentage}
                    onChange={(e) => handleInputChange(currentBatchIndex, 'sb_percentage', e.target.value)}
                    disabled={isBatchStepSaved(currentBatchIndex)}
                    className="h-14 text-xl px-4 w-full border-2 border-green-200 rounded-lg focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-white"
                    placeholder="Enter SB %"
                  />
                  {!batch.sb_percentage && (
                    <p className="text-sm text-red-500 mt-2">* SB Percentage is required for SANTOSH entries</p>
                  )}
                </Card>
              )}
              
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Weight (KG)
                </Label>
                <Input
                  data-testid={`lead-ingot-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.lead_ingot_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'lead_ingot_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pieces
                </Label>
                <Input
                  data-testid={`lead-ingot-pieces-input-${currentBatchIndex}`}
                  type="number"
                  value={batch.lead_ingot_pieces}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'lead_ingot_pieces', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0"
                />
              </div>

              {renderMultiImageUpload(currentBatchIndex, 'lead_ingot_images', 'Photos of Weight')}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Dross Inputs</h2>
              
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Initial Dross (KG)
                </Label>
                <Input
                  data-testid={`initial-dross-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.initial_dross_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'initial_dross_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
              {renderMultiImageUpload(currentBatchIndex, 'initial_dross_images', 'Photos of Initial Dross')}

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  2nd Dross (KG)
                </Label>
                <Input
                  data-testid={`dross-2nd-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.dross_2nd_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'dross_2nd_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
              {renderMultiImageUpload(currentBatchIndex, 'dross_2nd_images', 'Photos of 2nd Dross')}

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  3rd Dross (KG)
                </Label>
                <Input
                  data-testid={`dross-3rd-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.dross_3rd_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'dross_3rd_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
              {renderMultiImageUpload(currentBatchIndex, 'dross_3rd_images', 'Photos of 3rd Dross')}

              {/* Optional Remarks */}
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Remarks (Optional)
                </Label>
                <Textarea
                  data-testid={`dross-remarks-input-${currentBatchIndex}`}
                  value={batch.dross_remarks}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'dross_remarks', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="min-h-[100px] text-lg px-4 py-3 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="Enter any remarks or notes about the dross (optional)"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900" data-testid="step-title">Pure Lead Output</h2>
              
              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pure Lead Weight (KG)
                </Label>
                <Input
                  data-testid={`pure-lead-kg-input-${currentBatchIndex}`}
                  type="number"
                  step="0.01"
                  value={batch.pure_lead_kg}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'pure_lead_kg', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Pure Lead Pieces
                </Label>
                <Input
                  data-testid={`pure-lead-pieces-input-${currentBatchIndex}`}
                  type="number"
                  value={batch.pure_lead_pieces}
                  onChange={(e) => handleInputChange(currentBatchIndex, 'pure_lead_pieces', e.target.value)}
                  disabled={isBatchStepSaved(currentBatchIndex)}
                  className="h-16 text-2xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-4 focus:ring-orange-100 focus:border-orange-500 disabled:bg-slate-100"
                  placeholder="0"
                />
              </div>

              {renderMultiImageUpload(currentBatchIndex, 'pure_lead_images', 'Photos of Pure Lead Weight')}
            </div>
          )}

          {/* Save Batch Button */}
          {!isBatchStepSaved(currentBatchIndex) && (
            <Button
              onClick={() => saveBatchStep(currentBatchIndex)}
              data-testid={`save-batch-${currentBatchIndex}`}
              disabled={!canSaveCurrentStep(currentBatchIndex)}
              className="w-full h-14 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-6 h-6 mr-2" />
              Save Batch {currentBatchIndex + 1}
            </Button>
          )}
        </Card>

        {/* Summary of all batches */}
        <Card className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Batch Status for Step {step}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {batches.map((b, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-center ${
                  (step === 1 && b.step1_saved) || (step === 2 && b.step2_saved) || (step === 3 && b.step3_saved)
                    ? 'bg-green-100 border-2 border-green-300'
                    : 'bg-white border-2 border-slate-200'
                }`}
              >
                <p className="font-bold text-slate-900">Batch {idx + 1}</p>
                <p className="text-sm text-slate-600">
                  {(step === 1 && b.step1_saved) || (step === 2 && b.step2_saved) || (step === 3 && b.step3_saved)
                    ? '✓ Saved'
                    : 'Pending'}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {step > 1 && (
            <Button
              onClick={() => setStep(step - 1)}
              data-testid="back-step-button"
              className="flex-1 h-16 text-xl font-bold bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg"
            >
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              data-testid="next-step-button"
              disabled={!allBatchesSavedForCurrentStep()}
              className="flex-1 h-16 text-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalSubmit}
              data-testid="submit-entry-button"
              disabled={!allBatchesSavedForCurrentStep() || loading}
              className="flex-1 h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : `Submit ${batches.length} Batch(es)`}
            </Button>
          )}
        </div>

        {!allBatchesSavedForCurrentStep() && (
          <p className="text-center text-slate-500 mt-4">
            Save all batches for Step {step} before proceeding to {step < 3 ? 'next step' : 'submit'}
          </p>
        )}
      </div>
    </div>
  );
}
