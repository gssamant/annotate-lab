import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { createTheme } from "@mui/material/styles";
import { Box, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { useSnackbar } from '../SnackbarContext';
import { useTranslation, Trans } from "react-i18next";
import useMediaQuery from '@mui/material/useMediaQuery';
import config from '../config.js';

const theme = createTheme()

const ImageUpload = ({ onImageUpload, settingsImages }) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();
  const [images, setImages] = useState(settingsImages);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const isSmallDevice = useMediaQuery(theme.breakpoints.down('sm'));

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    if (fileRejections.length) {
      const { errors } = fileRejections[0];
      if (errors.length) {
        showSnackbar(errors[0].message, "error");
        return;
      }
    }

    const totalImages = images.length + acceptedFiles.length;
    if (totalImages > config.UPLOAD_LIMIT) {
      showSnackbar(t("error.configuration.image_upload.max"), "error");
      return;
    }

    const newImages = acceptedFiles.map((file) => {
      return Object.assign(file, {
        preview: URL.createObjectURL(file),
        imageName: file.name,
      });
    });

    uploadImages(newImages);
  }, [images, onImageUpload, showSnackbar]);

  const uploadImages = async (images) => {
    const formData = new FormData();

    images.forEach((image) => {
      formData.append('file', image);
    });

    try {
      setLoading(true);
      const response = await axios.post(`${config.SERVER_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          let percentCompleted = Math.floor((loaded * 100) / total);
          setProgress(percentCompleted);
        }
      });
      showSnackbar(response.data.message, 'success');

      const uploadedFiles = response.data.files;
      const uploadedImages = uploadedFiles.map(file => ({
        preview: file.url,
        filename: file.filename,
      }));
      setImages(uploadedImages);
      onImageUpload(uploadedImages);
    } catch (error) {
      const errorResponse = error?.response?.data;
      if (errorResponse) {
        showSnackbar(errorResponse?.message, 'error');
      } else {
        showSnackbar(t("error.server_connection"), 'error');
      }
      console.error('Error uploading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (filename, isNotFound = false) => {
    try {
      if (isNotFound) {
        const updatedImages = images.filter((image) => image.filename !== filename);
        setImages(updatedImages);
        onImageUpload(updatedImages);
      } else {
        const response = await axios.delete(`${config.SERVER_URL}/uploads/${filename}`);
        showSnackbar(response.data.message, 'success');

        // Update the state to remove the deleted image
        const updatedImages = images.filter((image) => image.filename !== filename);
        setImages(updatedImages);
        onImageUpload(updatedImages);
      }
    } catch (error) {
      if (error?.response?.data) {
        showSnackbar(error.response.data.message, 'error');
      } else {
        showSnackbar(t("error.server_connection"), 'error');
      }
      console.error('Error deleting image:', error);
    }
  };

  const handleImageError = (index) => {
    const updatedImages = [...images];
    updatedImages[index].isNotFound = true;
    setImages(updatedImages);
    showSnackbar(t("error.image_not_found"), 'error');
  };

  const handleRemoveImage = (index) => {
    const imageToRemove = images[index];
    if (imageToRemove && !imageToRemove.filename) {
      if (imageToRemove.src) {
        let parts = imageToRemove.src.split('/');
        let filename = parts[parts.length - 1];
        imageToRemove.filename = filename;
      }
    }
    if (imageToRemove && imageToRemove.filename) {
      deleteImage(imageToRemove.filename, imageToRemove.isNotFound);
    } else {
      console.error('Error deleting image: imageToRemove or imageToRemove.filename is undefined');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*',
    multiple: true,
    maxFiles: config.UPLOAD_LIMIT,
  });

  return (
    <>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed #ccc',
          padding: isSmallDevice ? '0.5rem' :'1rem',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          borderRadius: '4px',
          minHeight: '200px',
          width: isSmallDevice ? 'auto': '52vw',
        }}
      >
        <input {...getInputProps()} data-testid="file-input" />
        {isDragActive ? (
          <Typography sx={{ fontSize: "14px", color: "rgb(117, 117, 117)" }}>{t("configuration.image_upload.file_drop")}</Typography>
        ) : (
          <>
            {loading ? (
              <>
                {progress > 0 && progress < 100 ? (
                  <>
                    <progress value={progress} max={100} />
                    <p>{progress}%</p>
                  </>
                ) : (
                  <div className="loading">{t("loading")}</div>
                )}
              </>
            ) : (
              <Typography sx={{ fontSize: "14px", color: "rgb(117, 117, 117)" }}>
                <Trans i18nKey="configuration.image_upload.description" values={{maxImages: config.UPLOAD_LIMIT}}/>
              </Typography>
            )}
          </>
        )}
      </Box>
      <Box display="flex" flexWrap="wrap" gap="1rem">
        {images.map((image, index) => (
          <Box
            key={index}
            position="relative"
            display="inline-flex"
            flexDirection="column"
            alignItems="center"
          >
            <img
              src={image.preview || image.src}
              alt="preview"
              onError={() => handleImageError(index)}
              style={{
                width: isSmallDevice ? '65px' : '82px', 
                height: isSmallDevice ? '65px' : '82px',
                objectFit: 'cover',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            />
            <IconButton
              size="small"
              onClick={() => handleRemoveImage(index)}
              sx={{ position: 'absolute', top: '0', right: '0' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </>
  );
};

export default ImageUpload;
