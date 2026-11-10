import { Blobatar } from "@blobatar/react";
import Image from "next/image";
import "blobatar/motion.css";

export default function Avatar ({ name, size=24, src, alt }) {
    if (src) {
        return (
            <Image
                src={src}
                alt={alt || name || "Imagen de perfil"}
                width={size}
                height={size}
                unoptimized
                className="object-cover"
            />
        );
    }

    return (
        <Blobatar name={name} size={size} animate="always"/>
    )
}
