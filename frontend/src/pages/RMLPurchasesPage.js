import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Camera, ArrowLeft, Plus, X, Calendar, ShoppingCart, Check } from 'lucide-react';
import { compressImage } from '@/utils/imageCompression';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RMLPurchasesPage({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Entry date for past-dated entries
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [batches, setBatches] = useState([{
    quantity_kg: '',
    pieces: '',
    sb_percentage: '',
    remarks: '',
    images: []
  }]);
  const [imagePreviews, setImagePreviews] = useState([{}]);

  const addBatch = () => {
    setBatches([...batches, {
      quantity_kg: '',
      pieces: '',
      sb_percentage: '',
      remarks: '',
      images: []
    }]);
    setImagePreviews([...imagePreviews, {}]);
  };

  const removeBatch = (index) => {
    if (batches.length > 1) {
      setBatches(batches.filter((_, i) => i !== index));
      setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    }
  };

  // Handle multiple files
  const handleMultipleFileChange = async (batchIndex, files) => {
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
            images: [...(newPreviews[batchIndex]?.images || []), ...previewUrls]
          };
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(compressedFile);
    }
    
    const newBatches = [...batches];
    newBatches[batchIndex].images = [...(newBatches[batchIndex].images || []), ...compressedFiles];
    setBatches(newBatches);
  };

  // Remove a specific image
  const removeImage = (batchIndex, imageIndex) => {
    const newBatches = [...batches];
    newBatches[batchIndex].images = newBatches[batchIndex].images.filter((_, i) => i !== imageIndex);
    setBatches(newBatches);
    
    const newPreviews = [...imagePreviews];
    if (newPreviews[batchIndex]?.images) {
      newPreviews[batchIndex].images = newPreviews[batchIndex].images.filter((_, i) => i !== imageIndex);
      setImagePreviews(newPreviews);
    }
  };

  const handleInputChange = (batchIndex, field, value) => {
    const newBatches = [...batches];
    newBatches[batchIndex][field] = value;
    setBatches(newBatches);
  };

  const handleSubmit = async () => {
    // Validate all batches
    const incompleteBatches = batches.filter(b => 
      !b.quantity_kg || !b.pieces || !b.sb_percentage || b.images.length === 0
    );

    if (incompleteBatches.length > 0) {
      toast.error('Please complete all batch fields (quantity, pieces, SB%, and at least one photo)');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      
      const batchesData = batches.map(batch => ({
        quantity_kg: parseFloat(batch.quantity_kg),
        pieces: parseInt(batch.pieces),
        sb_percentage: parseFloat(batch.sb_percentage),
        remarks: batch.remarks || ''
      }));
      
      form.append('batches_data', JSON.stringify(batchesData));
      form.append('entry_date', entryDate);
      
      batches.forEach(batch => {
        // Send first image for backward compatibility
        if (batch.images[0]) {
          form.append('files', batch.images[0]);
        }
      });

      const token = localStorage.getItem('token');
      await axios.post(`${API}/rml-purchases`, form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`${batches.length} batch(es) saved successfully!`);
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    return batches.every(batch => 
      batch.quantity_kg && batch.pieces && batch.sb_percentage && batch.images.length > 0
    );
  };

  // Render multiple image upload
  const renderMultiImageUpload = (batchIndex) => {
    const images = imagePreviews[batchIndex]?.images || [];
    
    return (
      <div>
        <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
          Photos
        </Label>
        
        {/* Existing images */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {images.map((img, imgIdx) => (
              <div key={imgIdx} className="relative">
                <img src={img} alt={`Preview ${imgIdx + 1}`} className="h-24 w-full object-cover rounded-lg border-2 border-slate-200" />
                <button
                  onClick={() => removeImage(batchIndex, imgIdx)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add more images */}
        <label
          htmlFor={`images-${batchIndex}`}
          className="border-4 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-purple-50 hover:border-purple-300 transition-colors cursor-pointer h-32 flex flex-col items-center justify-center gap-2"
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
        
        <input
          id={`images-${batchIndex}`}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => handleMultipleFileChange(batchIndex, e.target.files)}
          className="hidden"
        />
        
        {images.length > 0 && (
          <p className="text-sm text-slate-500 mt-1">{images.length} photo(s) added</p>
        )}
      </div>
    );
  };

  // Generate SKU preview based on remarks, sb%, and date
  const getSKUPreview = (batch) => {
    if (!batch.sb_percentage) return '';
    const remarks = batch.remarks || 'RML';
    const sb = parseFloat(batch.sb_percentage);
    // Format date as DD/MM/YYYY
    const dateParts = entryDate.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    return `${remarks}, ${sb}%, ${formattedDate}`;
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-purple-600 border-b border-purple-700 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/')}
              data-testid="back-button"
              className="h-12 px-4 bg-purple-700 hover:bg-purple-800 text-white border-0 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">RML Purchases</h1>
              <p className="text-base text-purple-100">{batches.length} batch(es)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Date Picker Card */}
        <Card className="bg-purple-50 border-purple-200 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <Label className="text-sm font-bold text-purple-700 uppercase">Entry Date</Label>
            </div>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="h-12 text-lg px-4 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-400 bg-white"
              data-testid="entry-date-input"
            />
            <p className="text-sm text-purple-600">Select date for this purchase</p>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <ShoppingCart className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="text-base font-semibold text-blue-900">Remelted Lead Purchase</p>
              <p className="text-sm text-blue-700">Enter purchased RML with SB percentage. Each SB% will create a separate SKU for use in Refining.</p>
            </div>
          </div>
        </Card>

        {/* Batch Forms */}
        {batches.map((batch, batchIndex) => (
          <Card key={batchIndex} className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-slate-900">Batch {batchIndex + 1}</h3>
                {batch.sb_percentage && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-full">
                    SKU: {getSKUPreview(batch.sb_percentage)} ({batch.sb_percentage}%)
                  </span>
                )}
              </div>
              {batches.length > 1 && (
                <Button
                  onClick={() => removeBatch(batchIndex)}
                  data-testid={`remove-batch-${batchIndex}`}
                  className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Quantity (KG)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={batch.quantity_kg}
                    onChange={(e) => handleInputChange(batchIndex, 'quantity_kg', e.target.value)}
                    className="h-14 text-xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Pieces
                  </Label>
                  <Input
                    type="number"
                    value={batch.pieces}
                    onChange={(e) => handleInputChange(batchIndex, 'pieces', e.target.value)}
                    className="h-14 text-xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                    SB Percentage (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={batch.sb_percentage}
                    onChange={(e) => handleInputChange(batchIndex, 'sb_percentage', e.target.value)}
                    className="h-14 text-xl px-4 w-full border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Remarks (Optional)
                </Label>
                <Textarea
                  value={batch.remarks}
                  onChange={(e) => handleInputChange(batchIndex, 'remarks', e.target.value)}
                  className="min-h-[80px] text-lg px-4 py-3 w-full border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                  placeholder="Enter any remarks about this purchase"
                />
              </div>

              {renderMultiImageUpload(batchIndex)}
            </div>
          </Card>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={addBatch}
            data-testid="add-batch-button"
            className="flex-1 h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            Add Another Batch
          </Button>
          <Button
            onClick={handleSubmit}
            data-testid="submit-entry-button"
            disabled={!canSubmit() || loading}
            className="flex-1 h-16 text-xl font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl rounded-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : `Save ${batches.length} Batch(es)`}
            <Check className="w-6 h-6 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
